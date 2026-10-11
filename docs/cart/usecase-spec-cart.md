# 📄 USE CASE SPECIFICATION: QUẢN LÝ GIỎ HÀNG (CART)

## 1. Thông tin chung
* **Mã Use Case:** UC-CART-01
* **Tên Use Case:** Quản lý Giỏ hàng và Khởi tạo đơn (Manage Cart & Checkout)
* **Tác nhân (Actor):** Khách hàng (Customer)
* **Mô tả ngắn gọn:** Cho phép Khách hàng xem danh sách các món đã chọn, thay đổi số lượng, xóa món và xác nhận chuyển sang bước Thanh toán.

## 2. Điều kiện
* **Tiền điều kiện (Pre-conditions):**
  * Hệ thống hoạt động bình thường.
  * Khách hàng đã có tài khoản và đăng nhập thành công (yêu cầu bắt buộc để gọi API tạo đơn theo `API Contract`).
  * Khách hàng đã thêm ít nhất 1 sản phẩm vào giỏ hàng từ trang Menu hoặc Chi tiết sản phẩm.
* **Hậu điều kiện (Post-conditions):**
  * Trạng thái Giỏ hàng (Local State) được làm sạch.
  * Một bản ghi Đơn hàng (Order) mới được tạo trong Database với trạng thái `PENDING`.
  * Khách hàng được chuyển hướng sang giao diện Thanh toán thành công.

## 3. Basic flow (luồng sự kiện chính)
1. Khách hàng nhấn vào biểu tượng giỏ hàng.
2. Hệ thống (Frontend) trượt mở giao diện giỏ hàng, đọc dữ liệu từ Zustand State.
3. Hệ thống hiển thị danh sách sản phẩm.
4. Hệ thống tự động tính toán và hiển thị tổng tiền cuối cùng.
5. Khách hàng nhấn nút **"Thanh toán"**.
6. Hệ thống hiển thị loading state và gửi request payload (`POST /api/v1/orders`) xuống backend.
7. Backend kiểm tra tính hợp lệ của dữ liệu (class validator), xác minh tồn kho (stock) và đối chiếu giá tiền (price).
8. Backend khởi tạo đơn hàng thành công và trả về `orderId`.
9. Hệ thống (frontend) xóa sạch giỏ hàng hiện tại và chuyển hướng Khách hàng sang trang thanh toán với `orderId` tương ứng.

## 4. Alternative Flows (luồng thay thế)

### 4.1. Cập nhật số lượng / Xóa món
* Tại bước 3 của luồng chính, khách hàng có thể thêm, xóa hoặc sửa sản phẩm theo ý.
* Hệ thống (Frontend) cập nhật lại Zustand State ngay lập tức (không gọi API).
* Hệ thống tự động tính toán lại tổng tiền và cập nhật số lượng Badge.
* Quay lại bước 3 của luồng chính.

## 5. Exception Flows (luồng ngoại lệ)

### 5.1. Giỏ hàng trống (Empty State)
* Tại bước 2 của luồng chính, nếu Frontend phát hiện Zustand State không có sản phẩm nào.
* Hệ thống hiển thị giao diện "Giỏ hàng trống".
* Hệ thống vô hiệu hóa hoặc ẩn nút "Thanh toán".
* Khách hàng nhấn nút "Tiếp tục mua hàng" để đóng giỏ hàng.

### 5.2. Lỗi dữ liệu đầu vào (Bad Request - 400)
* Tại bước 7 của luồng chính, Backend phát hiện Payload gửi lên bị sai định dạng.
* Backend từ chối xử lý và trả về mã lỗi 400 kèm thông báo chi tiết.
* Hệ thống (Frontend) tắt Loading, hiển thị thông báo lỗi (Toast/Alert) yêu cầu Khách hàng thử lại.

### 5.3. Hết hàng hoặc Lệch giá (Business Logic Error - 400)
* Tại bước 7 của luồng chính, Backend truy vấn Database và phát hiện sản phẩm đã hết tồn kho hoặc giá sản phẩm đã bị thay đổi bởi Admin.
* Backend từ chối tạo đơn, trả về mã lỗi 400.
* Hệ thống (Frontend) tắt Loading, hiện cảnh báo đỏ báo cho Khách hàng biết món nào đã hết hàng/đổi giá.
* Hệ thống cập nhật lại trạng thái giỏ hàng theo dữ liệu mới nhất từ Backend.
* Khách hàng xem lại giỏ hàng và tiếp tục từ bước 3 của luồng chính.

## 6. Dữ liệu liên quan (Related Data / Entities)
Use Case này thực hiện các thao tác Đọc (Read), Thêm (Create) và Xóa (Delete) trên các vùng dữ liệu sau:

### 6.1. Dữ liệu Frontend (Local State)
* **`CartState` (Zustand/Local Storage):** 
  * **Đọc:** Lấy danh sách `CartItem` hiện có để hiển thị lên UI.
  * **Cập nhật:** Thêm/sửa/xóa item trong lúc khách hàng thao tác.
  * **Xóa (Clear):** Xóa toàn bộ dữ liệu khi nhận được mã `201 Created` từ Backend.

### 6.2. Dữ liệu Backend (Database)
* **Bảng `Product`, `ProductSizePrice`, `Topping`:**
  * **Thao tác:** Đọc (Read-only).
  * **Mục đích:** Truy xuất `basePrice`, `sizePrice`, `toppingPrice`, `isAvailable` và `stock` để kiểm tra chéo với dữ liệu từ Frontend gửi lên, đảm bảo tính toàn vẹn dữ liệu.
* **Bảng `Order` (Đơn hàng gốc):**
  * **Thao tác:** Tạo mới (Create).
  * **Mục đích:** Lưu thông tin tổng quát của đơn hàng (Mã khách hàng, tổng tiền, trạng thái mặc định là `PENDING`).
* **Bảng `OrderItem` (Chi tiết món):**
  * **Thao tác:** Tạo mới (Create).
  * **Mục đích:** Lưu từng món đồ uống khách hàng đã đặt (Id món, Size, số lượng, giá tiền tại thời điểm chốt đơn).
* **Bảng `OrderItemTopping` (Chi tiết Topping của món):**
  * **Thao tác:** Tạo mới (Create).
  * **Mục đích:** Map các topping đi kèm với từng `OrderItem` cụ thể.