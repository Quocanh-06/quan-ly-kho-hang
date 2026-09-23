const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Kết nối két sắt Supabase qua Session Pooler
const pool = new Pool({
    connectionString: "postgresql://postgres.vrmeqztnegkfzntqlqwh:*QUOCanh060606@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log("✅ Đã chui vào két sắt Supabase thành công!"))
    .catch((err) => console.error("❌ Lỗi kết nối Database:", err));

// ================= KHU VỰC API =================

// API test hệ thống
app.get('/', (req, res) => {
    res.json({ message: "Máy chủ API của Tech Lead Quốc Anh đã sẵn sàng!" });
});

// API 1: Lấy danh sách toàn bộ sản phẩm trong kho (GET /products)
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi khi lấy sản phẩm:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi tải kho hàng" });
    }
});

// API 2: Nhập sản phẩm mới vào kho (POST /products)
app.post('/products', async (req, res) => {
    try {
        // Hứng đủ 3 trường dữ liệu: tên, giá, số lượng
        const { product_name, price, stock_quantity } = req.body; 
        
        // Bơm đủ 3 tham số vào câu lệnh SQL
        const result = await pool.query(
            'INSERT INTO products (product_name, price, stock_quantity) VALUES ($1, $2, $3) RETURNING *',
            [product_name, price, stock_quantity]
        );
        
        res.json({ message: "✅ Đã nhập hàng thành công!", data: result.rows[0] });
    } catch (err) {
        console.error("Lỗi khi thêm sản phẩm:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi nhập hàng" });
    }
});
// API 3: Xóa sản phẩm khỏi kho (DELETE /products/:id)
app.delete('/products/:id', async (req, res) => {
    try {
        const { id } = req.params; // Lấy mã ID của sản phẩm từ trên đường dẫn URL
        
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm này trong kho" });
        }
        
        res.json({ message: "🗑️ Đã xóa sản phẩm thành công!", deleted_item: result.rows[0] });
    } catch (err) {
        console.error("Lỗi khi xóa sản phẩm:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi xóa hàng" });
    }
});
// API 4: Cập nhật thông tin sản phẩm (PUT /products/:id)
app.put('/products/:id', async (req, res) => {
    try {
        const { id } = req.params; // Lấy ID cần sửa từ URL
        const { product_name, price, stock_quantity } = req.body; // Lấy dữ liệu mới từ người dùng
        
        // Cập nhật dữ liệu mới vào két sắt
        const result = await pool.query(
            'UPDATE products SET product_name = $1, price = $2, stock_quantity = $3 WHERE id = $4 RETURNING *',
            [product_name, price, stock_quantity, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm cần sửa" });
        }
        
        res.json({ message: "✏️ Đã cập nhật thông tin thành công!", updated_item: result.rows[0] });
    } catch (err) {
        console.error("Lỗi khi cập nhật sản phẩm:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi sửa hàng" });
    }
});

// ===============================================

// Nổ máy Server (LUÔN NẰM CUỐI CÙNG)
app.listen(port, () => {
    console.log(`🚀 Server đang chạy ngầm tại cổng ${port}`);
});