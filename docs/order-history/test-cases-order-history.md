# Test Cases: Order History (Lịch sử & Chi tiết đơn hàng)

> **Feature:** Order History | **Owner:** History Team | **Phiên bản:** v1.1  
> **Phạm vi kiểm thử:** Kiểm thử các API tra cứu lịch sử đơn hàng (`GET /api/v1/orders/me`), xem chi tiết đơn hàng (`GET /api/v1/orders/:id`), hủy đơn hàng (`POST /api/v1/orders/:id/cancel`) phía Backend NestJS và các màn hình hiển thị tương ứng phía Frontend Next.js (`/orders`, `/orders/:id`).

---

## 1. PHẠM VI & MỤC TIÊU KIỂM THỬ

1. **Backend API (`GET /api/v1/orders/me`):**
   - Xác thực bắt buộc qua `JwtAuthGuard`. Backend trích xuất danh tính trực tiếp từ `req.user.sub`.
   - Kiểm tra lọc theo trạng thái đơn hàng (`status?: OrderStatus`).
   - Kiểm tra phân trang ổn định (`page`, `limit`), tổng số trang (`totalPages`) và cờ trang tiếp theo (`hasNextPage`).
   - Sắp xếp đơn hàng giảm dần theo thời gian tạo (`createdAt DESC, id DESC`).
   - Tính toán chính xác tổng số ly của mỗi đơn (`itemCount = Σ quantity`).
2. **Backend API Chi tiết (`GET /api/v1/orders/:id`):**
   - Kiểm tra bảo vệ quyền sở hữu: người dùng chỉ được xem đơn hàng của chính mình.
   - Trả về `404 Not Found` nếu đơn hàng không tồn tại hoặc thuộc sở hữu của người dùng khác.
   - Nạp đầy đủ thông tin dòng món, size, topping, voucher giảm giá, lịch sử thanh toán và điểm loyalty tích được.
3. **Backend API Hủy đơn (`POST /api/v1/orders/:id/cancel`):**
   - Chỉ cho phép hủy đơn ở trạng thái hợp lệ theo State Machine (`PENDING` hoặc `PAYMENT_FAILED`).
   - Từ chối hủy đơn đã thanh toán (`PAID`) hoặc hoàn tất (`COMPLETED`) với mã lỗi `409 Conflict`.
   - Đảm bảo hoàn trả tồn kho sản phẩm và topping vào database khi hủy đơn thành công.
4. **Frontend UI (`/orders`, `/orders/:id`):**
   - Kiểm tra hiển thị bộ tab lọc: *Tất cả, Chờ thanh toán, Đang xử lý, Hoàn tất, Đã hủy*.
   - Kiểm tra hiển thị banner chúc mừng *"Thanh toán thành công"* khi chuyển từ checkout sang (`?paid=1`).
   - Kiểm tra hiển thị nút *"Hủy đơn hàng"* và cập nhật UI khi hủy đơn.

---

## 2. DANH MỤC TEST CASES

### 2.1 Backend API Tests (`GET /api/v1/orders/me` & `GET /api/v1/orders/:id`)

| ID | Tình huống kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-HIS-01** | Lấy danh sách lịch sử đơn thành công | Bearer JWT hợp lệ, người dùng đã có đơn hàng | `200 OK`, trả về danh sách `items` kèm object `pagination` bọc qua `TransformInterceptor` |
| **TC-HIS-02** | Lịch sử đơn của người dùng mới | Bearer JWT hợp lệ, người dùng chưa từng đặt đơn nào | `200 OK`, `items: []`, `pagination.total: 0`, không bị lỗi 500 |
| **TC-HIS-03** | Chưa đăng nhập khi lấy lịch sử | Không gửi Bearer JWT trong Header | `401 Unauthorized`: `{ success: false, message: "Vui lòng đăng nhập để tiếp tục" }` |
| **TC-HIS-04** | JWT hết hạn khi lấy lịch sử | Gửi token đã quá hạn sử dụng | `401 Unauthorized` |
| **TC-HIS-05** | Phân trang: Trang đầu tiên (`page=1, limit=5`) | Người dùng có 12 đơn hàng | Trả về 5 đơn hàng mới nhất, `pagination: { page: 1, limit: 5, total: 12, totalPages: 3, hasNextPage: true }` |
| **TC-HIS-06** | Phân trang: Trang cuối cùng (`page=3, limit=5`) | Người dùng có 12 đơn hàng | Trả về 2 đơn hàng còn lại, `pagination: { page: 3, limit: 5, total: 12, totalPages: 3, hasNextPage: false }` |
| **TC-HIS-07** | Phân trang: Trang vượt quá tổng số trang | `page=99, limit=20` | `200 OK`, `items: []`, `hasNextPage: false` |
| **TC-HIS-08** | Lọc theo trạng thái hợp lệ | Gửi `GET /api/v1/orders/me?status=COMPLETED` | Tất cả đơn trong `items` đều có `status === "COMPLETED"` |
| **TC-HIS-09** | Lọc theo trạng thái không hợp lệ | Gửi `GET /api/v1/orders/me?status=INVALID_STATUS` | `400 Bad Request` (ValidationPipe bắt lỗi enum) |
| **TC-HIS-10** | Lấy chi tiết đơn hàng của chính mình | Gửi `GET /api/v1/orders/:id` với ID đơn thuộc user | `200 OK`, trả về đầy đủ chi tiết đơn: danh sách món, phụ thu size, topping, thanh toán, điểm thưởng |
| **TC-HIS-11** | Lấy chi tiết đơn của người dùng khác | Gửi `GET /api/v1/orders/:id` với ID đơn thuộc user B nhưng JWT của user A | `404 Not Found`: `{ success: false, message: "Không tìm thấy đơn hàng" }` (Bảo mật quyền riêng tư) |
| **TC-HIS-12** | Lấy chi tiết đơn với ID không tồn tại | Gửi `GET /api/v1/orders/:id` với ID ngẫu nhiên | `404 Not Found`: `{ success: false, message: "Không tìm thấy đơn hàng" }` |

---

### 2.2 Backend API Hủy Đơn Tests (`POST /api/v1/orders/:id/cancel`)

| ID | Tình huống kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-HIS-CN-01** | Hủy đơn đang ở trạng thái `PENDING` | Gửi `POST /api/v1/orders/:id/cancel` kèm JWT chính chủ | `200 OK`, đơn chuyển sang `CANCELLED`, hoàn trả số lượng tồn kho sản phẩm và topping trong database |
| **TC-HIS-CN-02** | Hủy đơn đang ở trạng thái `PAYMENT_FAILED` | Gửi `POST /api/v1/orders/:id/cancel` khi thanh toán bị lỗi | `200 OK`, đơn chuyển sang `CANCELLED`, hoàn trả tồn kho thành công |
| **TC-HIS-CN-03** | Chặn hủy đơn đã thanh toán (`PAID`) | Đơn hàng đã ở trạng thái `PAID` | `409 Conflict`: Không cho phép hủy đơn qua API này (tránh gian lận tiền bạc) |
| **TC-HIS-CN-04** | Chặn hủy đơn đã hoàn tất (`COMPLETED`) | Đơn hàng đã hoàn tất giao nước | `409 Conflict`: State Machine từ chối chuyển tiếp |
| **TC-HIS-CN-05** | Hủy lặp lại 2 lần liên tiếp | Đơn đã ở trạng thái `CANCELLED`, gửi yêu cầu hủy lần 2 | `409 Conflict`: Đơn đã kết thúc, không thể hủy tiếp |
| **TC-HIS-CN-06** | Hủy đơn của người dùng khác | Gửi yêu cầu hủy với ID đơn của người khác | `404 Not Found`: Không tìm thấy đơn hàng của user |

---

### 2.3 Frontend UI Tests (`/orders` & `/orders/:id`)

| ID | Tình huống kiểm thử | Thao tác người dùng | Kết quả mong đợi |
|---|---|---|---|
| **TC-HIS-UI-01** | Chuyển hướng khi chưa đăng nhập | Chưa đăng nhập truy cập trực tiếp `/orders` | Hook `useRequireAuth` tự động chuyển hướng sang `/auth/login?next=/orders` |
| **TC-HIS-UI-02** | Hiển thị danh sách lịch sử rỗng | Tài khoản mới mở trang `/orders` | Hiển thị thông báo *"Bạn chưa có đơn hàng nào"*, icon ly cà phê rỗng và nút *"Khám phá thực đơn"* |
| **TC-HIS-UI-03** | Chuyển đổi các Tab trạng thái | Bấm chọn tab *"Chờ thanh toán"* hoặc *"Đã hủy"* | Gọi API kèm tham số `status` tương ứng, cập nhật danh sách đơn theo tab |
| **TC-HIS-UI-04** | Điều hướng phân trang | Bấm nút *"Trang sau"* | Tăng `page = page + 1`, tải danh sách của trang tiếp theo |
| **TC-HIS-UI-05** | Bấm xem chi tiết một đơn hàng | Bấm vào card đơn hàng hoặc nút *"Chi tiết"* | Điều hướng sang trang `/orders/:id` |
| **TC-HIS-UI-06** | Hiển thị banner thanh toán thành công | URL có query `?paid=1` (vừa thanh toán xong) | Hiển thị banner màu xanh nổi bật chúc mừng đặt hàng thành công và số điểm tích lũy |
| **TC-HIS-UI-07** | Hiển thị huy hiệu trạng thái (Badge) | Đơn hàng ở các trạng thái khác nhau | Hiển thị đúng `<OrderStatusBadge />`: PENDING (Vàng), PAID (Xanh lá), COMPLETED (Xanh lá đậm), CANCELLED (Xám) |
| **TC-HIS-UI-08** | Thực hiện hủy đơn từ trang chi tiết | Bấm nút *"Hủy đơn hàng"* khi đơn còn PENDING | Hiển thị xác nhận, gọi API hủy đơn, badge cập nhật sang *"ĐÃ HỦY"* ngay trên giao diện |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Bảo mật danh tính:** Tuyệt đối không cho phép người dùng xem hoặc hủy đơn hàng của người dùng khác.
- **Tính toàn vẹn kho:** Khi đơn bị hủy, số lượng sản phẩm và topping bắt buộc phải được hoàn trả lại kho trong cùng một transaction.
- **Trải nghiệm phân trang:** Phân trang mượt mà, hiển thị đúng tổng số trang và không cho phép bấm vượt quá trang hợp lệ.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-12):** Khởi tạo danh mục test case cho Lịch sử đơn hàng.
- **v1.1 (2026-10-25):** Bổ sung test case chi tiết cho API Hủy đơn kèm hoàn trả tồn kho và kiểm thử Tab lọc giao diện.
