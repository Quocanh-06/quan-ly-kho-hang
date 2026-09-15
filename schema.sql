-- 1. BẢNG SẢN PHẨM (Không có điều kiện chặn số âm ở stock_quantity)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG ĐƠN HÀNG (Ép kiểu chỉ nhận Standard hoặc Pre-order)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    total_amount INT NOT NULL,
    order_type VARCHAR(50) CHECK (order_type IN ('Standard', 'Pre-order')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG CHI TIẾT ĐƠN HÀNG (Khóa ngoại cứng, lưu giá tại thời điểm chốt)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price INT NOT NULL
);
