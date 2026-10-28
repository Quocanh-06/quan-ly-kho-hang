# Inventory Management System - Quản lý Kho hàng

Hệ thống quản lý kho hàng 2 web (React/Vite + Node/Express + Supabase), tách biệt hoàn toàn:
- **frontend-khach**: Cửa hàng khách hàng (mua sắm online, không cần đăng nhập)
- **frontend-admin**: Quản trị (quản lý kho, đơn hàng, yêu cầu đăng nhập)

## Tech Stack

- **Backend**: Node.js + Express + CORS + dotenv (Port 3000)
- **Frontend**: React 18 + Vite (frontend-khach port 5173, frontend-admin port 5174)
- **Database**: Supabase (PostgreSQL)

## Cấu trúc thư mục

```
inventory-management-system/
├── backend/
│   ├── index.js          # Express + Supabase + /login + rate limit + requireAdmin
│   ├── package.json      # express, cors, @supabase/supabase-js, dotenv
│   ├── .env              # SUPABASE_* + ADMIN_USERNAME/PASSWORD/SECRET_TOKEN
│   └── .env.example
├── frontend-khach/       # 🛒 Web cho KHÁCH (port 5173, không cần login)
│   ├── .env              # VITE_API_URL=http://localhost:3000
│   ├── vite.config.js    # port 5173
│   └── src/App.jsx       # Cửa hàng, tìm kiếm, giỏ hàng (nhập số trực tiếp), đặt hàng + cọc
├── frontend-admin/       # 📦 Web QUẢN TRỊ (port 5174, bắt buộc login)
│   ├── .env              # VITE_API_URL=http://localhost:3000
│   ├── vite.config.js    # port 5174
│   └── src/App.jsx       # Login → Tab Kho + Tab Đơn hàng, in hóa đơn PDF
├── database.sql          # Schema + orders/order_items + FK ON DELETE SET NULL
└── README.md
```

## Yêu cầu

- Node.js 18+
- Tài khoản Supabase (miễn phí tại supabase.com)

## Cài đặt & Chạy

### 1. Cấu hình Database (Supabase)

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor**, chạy toàn bộ nội dung file `database.sql`

### 2. Cấu hình Backend

```env
# backend/.env
# ⚠️ SUPABASE_URL KHÔNG có /rest/v1/ ở cuối
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=dán-anon-key-vào-đây
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MatKhauKhoDoan@2026
ADMIN_SECRET_TOKEN=chuoi_khoa_bi_mat_ngau_nhien_2026
```

### 3. Chạy Backend

```bash
cd backend
npm install
npm start
# http://localhost:3000
# Kiểm tra: curl http://localhost:3000/health
# Phải trả: {"status":"ok","supabase":"connected"}
```

### 4. Chạy Frontend

```bash
# Web khách hàng (Cửa hàng)
cd frontend-khach
npm install
npm run dev
# http://localhost:5173

# Web quản trị (Admin)
cd frontend-admin
npm install
npm run dev
# http://localhost:5174  → đăng nhập admin / MatKhauKhoDoan@2026
```

## 🔐 Bảo mật

- **Login**: Khách hàng không cần login. Admin đăng nhập qua `POST /login`, nhận token lưu trong `sessionStorage`
- **Rate Limiting**: Sai mật khẩu 5 lần/IP → khóa 5 phút (lỗi 429)
- **Middleware `requireAdmin`**: API quản trị (POST/PUT/DELETE /products, GET /orders) bắt buộc `Authorization: Bearer <token>`
- **API công khai**: GET /products, POST /orders

## Tính năng

✅ **Cửa hàng khách hàng** - Lưới thẻ sản phẩm, tìm kiếm, giỏ hàng, nhập số lượng trực tiếp  
✅ **Đặt hàng + cọc** - Bắt buộc cọc 10% (tối đa 1.500.000đ), còn lại trả khi nhận hàng  
✅ **Hóa đơn điện tử** - Modal trang trọng, in/PDF (`@media print` A4), có thông tin tài khoản thanh toán  
✅ **Quản trị kho** - Dashboard 3 thẻ thống kê, CRUD sản phẩm (form chung Thêm/Sửa), cảnh báo tồn kho dưới 5 bôi đỏ  
✅ **Lịch sử đơn hàng** - Bảng danh sách, nút "Xem & In Hóa đơn"  
✅ **RESTful API** - GET/POST/PUT/DELETE /products + GET/POST /orders  

## API Endpoints

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| POST | /login | Công khai | Đăng nhập admin (rate limit 5 lần/5 phút) |
| GET | /health | Công khai | Check kết nối Supabase |
| GET | /products | Công khai | Lấy tất cả sản phẩm |
| POST | /orders | Công khai | Tạo đơn hàng (check tồn kho → trừ kho → trả hóa đơn + cọc) |
| POST | /products | 🔐 Admin | Thêm sản phẩm |
| PUT | /products/:id | 🔐 Admin | Cập nhật sản phẩm |
| DELETE | /products/:id | 🔐 Admin | Xóa sản phẩm |
| GET | /orders | 🔐 Admin | Lịch sử đơn hàng kèm chi tiết |

### Header xác thực (API Admin)

```
Authorization: Bearer <ADMIN_SECRET_TOKEN>
```

## Troubleshooting

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| EADDRINUSE :::3000 | Port 3000 đã chạy trước đó | Kill process: `npx kill-port 3000` |
| Backend không kết nối Supabase | .env sai hoặc thiếu dotenv | Chạy `npm install dotenv`, kiểm tra SUPABASE_URL |
| Frontend lỗi CORS | Vite proxy thiếu route | Dùng `VITE_API_URL` trong `.env` |
| Login báo sai mật khẩu | Env chưa sync | Đảm bảo `.env` có `ADMIN_PASSWORD` đúng |

MIT