-- ============================================
-- DATABASE SCHEMA - Inventory Management System
-- Chạy trong Supabase SQL Editor
-- ============================================

-- Bảng sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  price NUMERIC(12, 0) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng đơn hàng
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  total_amount NUMERIC(14, 0) NOT NULL,
  status TEXT DEFAULT 'Đã thanh toán',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng chi tiết đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(12, 0)
);

-- Nếu bảng order_items đã tồn tại với FK cũ, cập nhật constraint -> ON DELETE SET NULL
-- (giữ lại lịch sử đơn hàng khi xóa sản phẩm)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'order_items' AND constraint_name = 'order_items_product_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
    ALTER TABLE order_items 
      ADD CONSTRAINT order_items_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (cho phép đọc/ghi tự do - demo)
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON products;
CREATE POLICY "Allow all operations" ON products
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON orders;
CREATE POLICY "Allow all operations" ON orders
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON order_items;
CREATE POLICY "Allow all operations" ON order_items
  FOR ALL USING (true) WITH CHECK (true);

-- Chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);