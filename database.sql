-- ============================================
-- DATABASE SCHEMA - Inventory Management System
-- Chạy trong Supabase SQL Editor
-- Tương thích: Tạo mới HOẶC cập nhật database hiện có
-- ============================================

-- ============================================
-- 1. BẢNG PRODUCTS - Tạo mới hoặc migrate
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  product_code TEXT,           -- Sẽ set NOT NULL UNIQUE sau khi fill data
  product_name TEXT NOT NULL,
  price NUMERIC(12, 0) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm constraint price >= 0 (an toàn nếu đã có)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_check;
ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0);

-- Migrate product_code: thêm cột -> fill data -> set NOT NULL UNIQUE
DO $$
BEGIN
  -- Thêm cột nếu chưa có
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'product_code') THEN
    ALTER TABLE products ADD COLUMN product_code TEXT;
  END IF;

  -- Fill dữ liệu cũ: SP + ID (VD: SP0001, SP0002)
  UPDATE products SET product_code = 'SP' || LPAD(id::TEXT, 4, '0') 
  WHERE product_code IS NULL;

  -- Set NOT NULL
  ALTER TABLE products ALTER COLUMN product_code SET NOT NULL;

  -- Set UNIQUE (tên constraint chuẩn)
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'products' AND constraint_name = 'products_product_code_key') THEN
    ALTER TABLE products ADD CONSTRAINT products_product_code_key UNIQUE (product_code);
  END IF;
END $$;

-- ============================================
-- 2. BẢNG ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  total_amount NUMERIC(14, 0) NOT NULL,
  status TEXT DEFAULT 'Đã thanh toán',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. BẢNG ORDER_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_code TEXT,  -- Lưu mã hàng tại thời điểm đặt
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(12, 0)
);

-- Thêm product_code vào order_items nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'order_items' AND column_name = 'product_code') THEN
    ALTER TABLE order_items ADD COLUMN product_code TEXT;
  END IF;
END $$;

-- ============================================
-- 4. FOREIGN KEY order_items.product_id -> ON DELETE SET NULL
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'order_items' AND constraint_name = 'order_items_product_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
  END IF;
  ALTER TABLE order_items 
    ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
END $$;

-- ============================================
-- 5. ROW LEVEL SECURITY (cho phép đọc/ghi tự do - demo)
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

-- ============================================
-- 6. CHỈ MỤC TỐI ƯU TRUY VẤN
-- ============================================
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- ============================================
-- 7. KIỂM TRA KẾT QUẢ (chạy để verify)
-- ============================================
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' ORDER BY ordinal_position;
--
-- SELECT conname, contype FROM pg_constraint 
-- WHERE conrelid = 'products'::regclass;