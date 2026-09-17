-- 0. Dọn dẹp móng cũ (Chỉ chạy 1 lần để làm mới)
DROP TABLE IF EXISTS order_items, orders, products, customers CASCADE;

-- 1. BẢNG KHÁCH QUEN (Tính năng mới thêm)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG SẢN PHẨM (Giữ nguyên gốc của bạn)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG ĐƠN HÀNG (Thay customer_name bằng customer_id để móc sang bảng 1)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id), 
    total_amount INT NOT NULL,
    order_type VARCHAR(50) CHECK (order_type IN ('Standard', 'Pre-order')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG CHI TIẾT ĐƠN HÀNG (Giữ nguyên tên unit_price của bạn)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price INT NOT NULL 
);
