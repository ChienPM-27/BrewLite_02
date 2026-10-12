# 📄 USE CASE SPECIFICATION: QUẢN LÝ GIỎ HÀNG (CART)

## 1. Thông tin chung
* **Mã Use Case:** UC-CART-01
* **Tên Use Case:** Quản lý Giỏ hàng và Khởi tạo đơn (Manage Cart & Checkout)
* **Tác nhân (Actor):** Khách hàng (Customer) - bao gồm cả Khách vãng lai khi xem/sửa và Khách hàng đã đăng nhập khi tiến hành thanh toán.
* **Mô tả ngắn gọn:** Cho phép Khách hàng xem danh sách các món đồ uống đã chọn, tùy chỉnh số lượng, xóa từng món, tự động tính tổng tiền và xác nhận chuyển sang bước Đặt hàng & Thanh toán.

## 2. Điều kiện
* **Tiền điều kiện (Pre-conditions):**
  * Hệ thống hoạt động bình thường.
  * Khách hàng đã thêm ít nhất 1 sản phẩm vào giỏ hàng từ trang Menu hoặc Chi tiết sản phẩm.
  * Khách hàng có thể là Khách vãng lai (Guest) khi duyệt món, thêm vào giỏ và xem/chỉnh sửa giỏ hàng (lưu cục bộ tại trình duyệt qua Zustand Persist / LocalStorage).
  * **Yêu cầu bắt buộc khi Thanh toán:** Khách hàng phải đăng nhập thành công và sở hữu JWT Bearer Token hợp lệ để gọi API tạo đơn (`POST /api/v1/orders`).
* **Hậu điều kiện (Post-conditions):**
  * Trạng thái Giỏ hàng (Local State / LocalStorage) được làm sạch sau khi tạo đơn thành công.
  * Một bản ghi Đơn hàng (`Order`) mới được tạo trong Cơ sở dữ liệu với trạng thái `PENDING` và `orderNumber` tự động tăng.
  * Các bản ghi Chi tiết đơn hàng (`OrderItem`) và Topping (`OrderItemTopping`) được tạo tương ứng với số lượng và đơn giá được Backend kiểm tra đối chiếu.
  * Khách hàng được chuyển hướng sang giao diện Thanh toán với `orderId` tương ứng.

## 3. Basic Flow (Luồng sự kiện chính)
1. Khách hàng nhấn vào biểu tượng Giỏ hàng trên thanh Header hoặc nút "Xem giỏ hàng".
2. Hệ thống (Frontend) mở giao diện Giỏ hàng (Cart Drawer hoặc Cart Page), đọc dữ liệu từ Zustand State (`useCartStore`).
3. Hệ thống hiển thị danh sách các món đồ uống đã chọn (tên món, hình ảnh, size, danh sách topping, số lượng và tạm tính từng dòng).
4. Hệ thống tự động tính toán và hiển thị tổng số lượng món (Badge) và tổng tiền tạm tính.
5. Khách hàng nhấn nút **"Thanh toán"**.
6. Hệ thống (Frontend) kiểm tra trạng thái xác thực người dùng:
   * Nếu Khách hàng đã đăng nhập (đã có Token JWT hợp lệ): Tiếp tục bước 7.
   * Nếu Khách hàng chưa đăng nhập: Hệ thống thực hiện luồng thay thế **4.2 (Xác thực người dùng)**.
7. Frontend hiển thị trạng thái đang xử lý (Loading State, vô hiệu hóa các nút bấm) và gửi request payload (`POST /api/v1/orders`) kèm Header `Authorization: Bearer <token>` xuống Backend.
8. Backend nhận request qua `AuthGuard`, kiểm tra định dạng dữ liệu thông qua `ValidationPipe` và `CreateOrderDto` (`quantity >= 1`, `size in ['S', 'M', 'L']`, ...).
9. Backend truy vấn Database để kiểm tra trạng thái mở bán (`isAvailable`), số lượng tồn kho (`stock`) và tính toán lại đơn giá chính xác (`basePrice + sizePrice + toppingPrices`).
10. Backend khởi tạo đơn hàng thành công trong CSDL (Order `PENDING`, OrderItem, OrderItemTopping) và trả về phản hồi chuẩn với mã `201 Created` kèm `orderId`.
11. Frontend tắt Loading State, xóa sạch dữ liệu giỏ hàng (`clearCart()`) và chuyển hướng Khách hàng sang màn hình Thanh toán với `orderId` được trả về.

## 4. Alternative Flows (Luồng thay thế)

### 4.1. Cập nhật số lượng / Xóa món trong giỏ
* Tại bước 3 của luồng chính, Khách hàng có thể:
  * Tăng số lượng (`+`) hoặc giảm số lượng (`-`) của một món: Hệ thống cập nhật trường `quantity` của `CartItem` tương ứng qua `cartItemId`. Nếu số lượng giảm về 0, hệ thống tự động xóa món đó khỏi giỏ hàng.
  * Nhấn biểu tượng Thùng rác (Xóa món): Hệ thống loại bỏ dòng `CartItem` tương ứng ra khỏi danh sách.
* Frontend cập nhật lại Zustand State và đồng bộ ngay vào LocalStorage (không cần gọi API server).
* Hệ thống tự động tính toán lại tổng tiền tạm tính và số lượng hiển thị trên Badge.
* Quay lại bước 3 của luồng chính.

### 4.2. Yêu cầu đăng nhập trước khi tạo đơn (Guest Checkout)
* Tại bước 6 của luồng chính, nếu Frontend phát hiện người dùng chưa đăng nhập:
* Hệ thống lưu đường dẫn chuyển hướng quay lại (redirect URL) và điều hướng Khách hàng sang trang Đăng nhập (`/auth/login`). Trạng thái giỏ hàng vẫn được bảo toàn trong LocalStorage.
* Sau khi Khách hàng đăng nhập thành công và nhận được JWT token, hệ thống tự động điều hướng Khách hàng trở lại Giỏ hàng để tiếp tục bước 7 của luồng chính.

## 5. Exception Flows (Luồng ngoại lệ)

### 5.1. Giỏ hàng trống (Empty State)
* Tại bước 2 của luồng chính, nếu danh sách `items` trong giỏ hàng rỗng (`items.length === 0`):
* Hệ thống hiển thị giao diện "Giỏ hàng của bạn đang trống" kèm hình minh họa.
* Hệ thống vô hiệu hóa nút "Thanh toán".
* Khách hàng nhấn nút "Khám phá thực đơn" để đóng giỏ hàng và duyệt món tại trang Menu.

### 5.2. Lỗi dữ liệu đầu vào (Bad Request - 400 Validation Error)
* Tại bước 8 của luồng chính, Backend phát hiện Payload gửi lên bị sai định dạng (ví dụ: `quantity <= 0`, thiếu `productId`, sai enum `size`):
* Backend từ chối xử lý, trả về mã lỗi `400 Bad Request` kèm mảng chi tiết các lỗi validation (bọc qua `AllExceptionsFilter`).
* Frontend tắt Loading State, hiển thị Toast cảnh báo lỗi dữ liệu và yêu cầu Khách hàng kiểm tra lại.

### 5.3. Hết hàng hoặc Lệch giá (Business Logic Error - 400 Bad Request)
* Tại bước 9 của luồng chính, Backend kiểm tra trong DB và phát hiện:
  * Sản phẩm tạm ngưng bán (`isAvailable = false`) hoặc tồn kho không đủ (`stock < quantity`).
  * Hoặc đơn giá của sản phẩm/topping vừa được cập nhật bởi Quản trị viên.
* Backend từ chối tạo đơn, trả về mã lỗi `400 Bad Request` kèm thông báo chi tiết (ví dụ: *"Sản phẩm Cà phê sữa (Size M) đã hết hàng"*).
* Frontend tắt Loading State, hiển thị thông báo lỗi nổi bật trên giao diện Giỏ hàng.
* Khách hàng điều chỉnh số lượng hoặc xóa món không hợp lệ và tiếp tục từ bước 3 của luồng chính.

### 5.4. Phiên đăng nhập hết hạn (401 Unauthorized)
* Tại bước 7 của luồng chính, nếu JWT token của Khách hàng đã hết hạn hoặc không hợp lệ:
* Backend từ chối yêu cầu và trả về lỗi `401 Unauthorized`.
* Frontend tắt Loading State, xóa token cũ nhưng **vẫn giữ nguyên giỏ hàng trong LocalStorage**, hiển thị thông báo "Phiên đăng nhập đã hết hạn" và chuyển hướng Khách hàng sang trang Đăng nhập lại.

## 6. Dữ liệu liên quan (Related Data / Entities)

### 6.1. Dữ liệu Frontend (Local State / Zustand)
* **`CartItem`:** Chứa thông tin hiển thị tại client gồm `id` (khóa định danh duy nhất của dòng món kết hợp `productId`, `size`, `toppingIds`), `productId`, `name`, `imageUrl`, `size`, `toppingIds`, `quantity`, `estimatedUnitPrice`.
* **`CartState`:** Lưu danh sách `items`, `totalAmount`, `badgeCount` và các actions (`addItem`, `removeItem`, `updateQuantity`, `clearCart`), được lưu giữ qua `localStorage` bằng middleware `persist`.

### 6.2. Dữ liệu Backend (Database PostgreSQL / Prisma)
* **Bảng `Product`, `ProductSizePrice`, `Topping` (Read-only):** Truy xuất để kiểm tra `isAvailable`, `stock`, `basePrice`, `priceAdjustment` và giá topping nhằm tính toán lại giá chính xác và trừ tồn kho khi đơn hàng được xác nhận.
* **Bảng `Order` (Create):** Khởi tạo bản ghi đơn hàng với `userId`, `status = PENDING`, `totalAmount`, `discountAmount`, `finalAmount`.
* **Bảng `OrderItem` (Create):** Lưu từng dòng sản phẩm với `orderId`, `productId`, `size`, `quantity`, `unitPrice`, `lineTotal`.
* **Bảng `OrderItemTopping` (Create):** Lưu các topping đi kèm với từng `orderItemId` cùng với giá `price` tại thời điểm đặt hàng.