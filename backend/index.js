require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { securityHeaders, strictCors, bodySizeLimit, sanitizeError } = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Trả về lỗi an toàn: trong production chỉ hiển thị message chung, không rò rinci chi tiết hệ thống
function sendError(res, status, message, err) {
  const payload = { error: message };
  if (!IS_PROD && err) {
    payload.detail = err.message || String(err);
  }
  res.status(status).json(payload);
}

app.use(securityHeaders);
app.use(strictCors(ALLOWED_ORIGIN));
app.use(express.json());
app.use(bodySizeLimit);

// ============================================
// ADMIN AUTH - Rate limiting (in-memory)
// ============================================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 5 * 60 * 1000; // 5 phút
const loginAttempts = new Map(); // key: ip -> { count, lockedUntil }

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// Middleware kiểm tra token quản trị
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Thiếu token xác thực' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: Token không hợp lệ' });
  }
  next();
}

// Đăng nhập quản trị (có chống dò mật khẩu)
app.post('/login', (req, res) => {
  const clientIp = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  // Đang bị khóa?
  if (record && record.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút',
      retryAfter,
    });
  }

  // Hết thời gian khóa -> reset
  if (record && record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(clientIp);
  }

  const { username, password } = req.body || {};

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    loginAttempts.delete(clientIp);
    return res.json({ token: process.env.ADMIN_SECRET_TOKEN });
  }

  // Ghi nhận lần đăng nhập sai
  const newCount = ((record && record.count) || 0) + 1;
  const newLockedUntil = newCount >= MAX_LOGIN_ATTEMPTS ? now + LOCK_TIME_MS : null;
  loginAttempts.set(clientIp, { count: newCount, lockedUntil: newLockedUntil });

  const attemptsLeft = Math.max(0, MAX_LOGIN_ATTEMPTS - newCount);
  res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu', attemptsLeft });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Inventory API is running', endpoints: ['/health', '/products'] });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', supabase: 'connected' });
  } catch (err) {
    sendError(res, 500, 'Supabase disconnected', err);
  }
});

app.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Supabase GET error:', error);
      throw error;
    }
    res.json(data || []);
  } catch (err) {
    console.error('GET /products error:', err.message || err);
    sendError(res, 500, 'Failed to fetch products', err);
  }
});

app.post('/products', requireAdmin, async (req, res) => {
  try {
    const { product_name, price, stock_quantity } = req.body;

    if (!product_name || price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{ product_name, price: Number(price), stock_quantity: Number(stock_quantity) }])
      .select()
      .single();

    if (error) {
      console.error('Supabase POST error:', error);
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /products error:', err.message || err);
    sendError(res, 500, 'Failed to create product', err);
  }
});

app.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, price, stock_quantity } = req.body;

    if (!product_name || price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ product_name, price: Number(price), stock_quantity: Number(stock_quantity) })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase PUT error:', error);
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
  } catch (err) {
    console.error('PUT /products/:id error:', err.message || err);
    sendError(res, 500, 'Failed to update product', err);
  }
});

// Lấy danh sách đơn hàng kèm chi tiết món hàng (mới nhất lên đầu) - CHỈ ADMIN
app.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Supabase GET orders error:', ordersError);
      throw ordersError;
    }

    // Gắn chi tiết order_items vào từng đơn hàng
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)
          .order('id', { ascending: true });

        if (itemsError) {
          console.error('Supabase GET order_items error:', itemsError);
        }

        return { ...order, items: items || [] };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    console.error('GET /orders error:', err.message || err);
    sendError(res, 500, 'Failed to fetch orders', err);
  }
});

// Tạo đơn hàng mới: kiểm tra tồn kho -> lưu đơn -> trừ kho
app.post('/orders', async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_address, items } = req.body;

    if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin khách hàng hoặc giỏ hàng rỗng' });
    }

    // Bước 1: Kiểm tra tồn kho từng mặt hàng
    for (const item of items) {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, product_name, stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (fetchError) {
        console.error('Supabase fetch product error:', fetchError);
        return res.status(400).json({ error: `Không tìm thấy sản phẩm ID ${item.product_id}` });
      }
      if (!product) {
        return res.status(400).json({ error: `Không tìm thấy sản phẩm ID ${item.product_id}` });
      }
      if (product.stock_quantity < Number(item.quantity)) {
        return res.status(400).json({
          error: `Sản phẩm "${product.product_name}" chỉ còn ${product.stock_quantity} trong kho (bạn đặt ${item.quantity})`,
        });
      }
    }

    // Bước 2: Tính tổng tiền và lưu đơn hàng
    const total_amount = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    // Tính tiền cọc: 10% giá trị đơn, tối đa 1.500.000 VND
    const deposit_amount = Math.min(Math.round(Number(total_amount) * 0.1), 1500000);
    const remaining_amount = Number(total_amount) - deposit_amount;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_name,
          customer_phone,
          customer_address: customer_address || '',
          total_amount,
          status: 'Đã thanh toán',
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Supabase insert order error:', orderError);
      throw orderError;
    }

    // Bước 2b: Lưu chi tiết order_items
    const orderItemsPayload = items.map((item) => ({
      order_id: order.id,
      product_id: Number(item.product_id),
      product_name: item.product_name,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)
      .select();

    if (itemsError) {
      console.error('Supabase insert order_items error:', itemsError);
      // Hoàn tác đơn hàng nếu lưu chi tiết thất bại
      await supabase.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    // Bước 3: Trừ số lượng tồn kho
    for (const item of items) {
      const { data: current, error: fetchErr } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (!fetchErr && current) {
        const newStock = Math.max(0, Number(current.stock_quantity) - Number(item.quantity));
        await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product_id);
      }
    }

    // Bước 4: Trả về đơn hàng kèm chi tiết + thông tin đặt cọc
    res.status(201).json({
      ...order,
      items: insertedItems || [],
      deposit_amount,
      remaining_amount,
    });
  } catch (err) {
    console.error('POST /orders error:', err.message || err);
    sendError(res, 500, 'Failed to create order', err);
  }
});

app.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE error:', error);
      if (error.code === 23503 || (error.message && error.message.includes('foreign key'))) {
        return res.status(409).json({ error: 'Không thể xóa: sản phẩm đang có trong đơn hàng' });
      }
      throw error;
    }
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /products/:id error:', err.message || err);
    sendError(res, 500, 'Failed to delete product', err);
  }
});

app.use(sanitizeError);

// Vercel serverless: export app, chỉ listen khi chạy local (không phải trên Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;