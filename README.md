## 🛠 Quy Trình Làm Việc (Git Workflow)

Để bảo vệ cấu trúc mã nguồn, toàn bộ đội dự án bắt buộc tuân thủ quy trình 3 bước sau:

**1. Tuyệt đối không can thiệp nhánh `main`**
* Nhánh `main` là "vùng xanh" chứa mã nguồn hoàn chỉnh đã chạy được. Không một ai (kể cả Leader) được phép viết code trực tiếp lên nhánh này.

**2. Quy tắc tạo nhánh (Branching)**
* Khi bắt đầu làm một nhiệm vụ mới, phải tạo một nhánh riêng từ nhánh `main`.
* **Cú pháp đặt tên nhánh:** `[vai-trò]/[tên-tính-năng-viết-thường-không-dấu]`
* *Ví dụ:* 
  * `frontend/giao-dien-gio-hang`
  * `backend/api-tao-don-hang`
  * `qa/test-hieu-nang`

**3. Quy tắc nộp code (Pull Request - PR)**
* Code xong trên nhánh cá nhân, nộp bài bằng cách mở **Pull Request** trên GitHub.
* Gắn thẻ (Tag) Leader vào để review (kiểm tra). Chỉ có **Project Leader** mới có quyền bấm gộp (Merge) nhánh của bạn vào `main` sau khi xác nhận không có lỗi logic hay xung đột hệ thống.

---

## 📄 Hợp Đồng Dữ Liệu (API & Naming Conventions)

Để Frontend và Backend giao tiếp mượt mà, không bị lỗi "undefined", toàn bộ tên biến gửi/nhận qua JSON bắt buộc phải viết theo chuẩn **`snake_case`** (chữ thường, nối bằng dấu gạch dưới).

### Bảng Quy Định Tên Biến Bắt Buộc

| Tên biến (Key) | Kiểu dữ liệu | Mô tả & Quy tắc ràng buộc |
| :--- | :--- | :--- |
| `product_id` | Chuỗi (UUID) | Mã định danh duy nhất của sản phẩm. |
| `product_name` | Chuỗi | Tên sản phẩm hiển thị. |
| `price` | Số nguyên (Int) | Giá bán sỉ mặc định lưu trong kho. |
| `stock_quantity` | Số nguyên (Int) | **ĐẶC BIỆT:** Phải cho phép mang giá trị ÂM (để phục vụ luồng Pre-order). |
| `order_id` | Chuỗi (UUID) | Mã định danh duy nhất của hóa đơn. |
| `customer_name`| Chuỗi | Tên cửa hàng tạp hóa đặt mua. |
| `total_amount` | Số nguyên (Int) | Tổng tiền của cả hóa đơn. |
| `order_type` | Chuỗi | Bắt buộc chỉ nhận 1 trong 2 giá trị: `"Standard"` (Giao ngay) hoặc `"Pre-order"` (Nợ hàng). |
| `status` | Chuỗi | Trạng thái đơn: `"Pending"` (Mặc định), `"Delivered"`, `"Cancelled"`. |
| `quantity` | Số nguyên (Int) | Số lượng khách hàng bấm mua trong giỏ. |
| `unit_price` | Số nguyên (Int) | **Bắt buộc:** Giá sản phẩm chốt cứng tại giây phút đặt hàng, không được lấy lại từ `price` để tránh sai công nợ. |
