# Test Cases: Order History (Lịch sử & Chi tiết đơn hàng)

> **Feature:** Order History | **Owner:** History Team | **Phiên bản:** v1.0  
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
   - Trả về `404 Not Found` với thông điệp `"Không tìm thấy đơn hàng"` nếu đơn hàng không tồn tại hoặc thuộc sở hữu của người dùng khác (đảm bảo không rò rỉ sự tồn tại của ID).
   - Nạp đầy đủ thông tin dòng món, size, topping, voucher giảm giá, lịch sử thanh toán và điểm loyalty tích được.
3. **Backend API Hủy đơn (`POST /api/v1/orders/:id/cancel`):**
   - Chỉ cho phép hủy đơn ở trạng thái hợp lệ theo State Machine (`PENDING` hoặc `PAYMENT_FAILED`).
   - Từ chối hủy đơn đã thanh toán (`PAID`), đã hoàn tất (`COMPLETED`) hoặc đã hủy (`CANCELLED`) với mã lỗi `409 Conflict` kèm thông điệp `"Đơn hàng ở trạng thái <STATUS> không thể hủy"`.
   - Trả về `404 Not Found` với thông điệp `"Không tìm thấy đơn hàng"` nếu người dùng cố gắng hủy đơn của người khác.
   - Đảm bảo hoàn trả tồn kho sản phẩm và topping vào database trong cùng một `$transaction`.
4. **Frontend UI (`/orders`, `/orders/:id`):**
   - Kiểm tra hiển thị bộ tab lọc: *Tất cả, Chờ thanh toán, Đang xử lý, Hoàn tất, Đã hủy*.
   - Kiểm tra hiển thị banner chúc mừng *"Thanh toán thành công!"* khi chuyển từ checkout sang (`?paid=1`).
   - Kiểm tra hiển thị nút *"Hủy đơn"* và cập nhật UI khi hủy đơn thành công.

---

## 2. DANH MỤC TEST CASES

### 2.1 Backend API Tests (`GET /api/v1/orders/me` & `GET /api/v1/orders/:id`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-HIS-01** | Lấy danh sách lịch sử đơn thành công | Bearer JWT hợp lệ, người dùng đã có đơn hàng | Gửi `GET /api/v1/orders/me` | `200 OK`, trả về danh sách `items` kèm object `pagination` bọc qua `TransformInterceptor` (`success: true, statusCode: 200, data: ...`) | Hợp lệ | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-02** | Lịch sử đơn của người dùng mới | Bearer JWT hợp lệ, người dùng chưa từng đặt đơn nào | Gửi `GET /api/v1/orders/me` | `200 OK`, `items: []`, `pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false }`, không bị lỗi 500 | Biên | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-03** | Chưa đăng nhập khi lấy lịch sử | Không có Bearer token | Gửi `GET /api/v1/orders/me` không gửi Bearer JWT trong Header | `401 Unauthorized`: `{ success: false, statusCode: 401, message: "Vui lòng đăng nhập để tiếp tục" }` | Lỗi | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | - |
| **TC-HIS-04** | JWT hết hạn khi lấy lịch sử | Token JWT đã quá hạn (expired) | Gửi `GET /api/v1/orders/me` kèm token đã quá hạn sử dụng | `401 Unauthorized` | Lỗi | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | - |
| **TC-HIS-05** | Phân trang: Trang đầu tiên (`page=1, limit=5`) | Người dùng có 12 đơn hàng | Gửi `GET /api/v1/orders/me?page=1&limit=5` | Trả về 5 đơn hàng mới nhất, `pagination: { page: 1, limit: 5, total: 12, totalPages: 3, hasNextPage: true }` | Hợp lệ | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-06** | Phân trang: Trang cuối cùng (`page=3, limit=5`) | Người dùng có 12 đơn hàng | Gửi `GET /api/v1/orders/me?page=3&limit=5` | Trả về 2 đơn hàng còn lại, `pagination: { page: 3, limit: 5, total: 12, totalPages: 3, hasNextPage: false }` | Hợp lệ | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-07** | Phân trang: Trang vượt quá tổng số trang | Người dùng có đơn hàng, nhưng gửi `page` lớn hơn `totalPages` | Gửi `GET /api/v1/orders/me?page=99&limit=20` | `200 OK`, `items: []`, `hasNextPage: false` | Biên | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-08** | Lọc theo trạng thái hợp lệ | Người dùng có nhiều đơn hàng ở các trạng thái khác nhau | Gửi `GET /api/v1/orders/me?status=COMPLETED` | `200 OK`, tất cả đơn trong `items` đều có `status === "COMPLETED"` | Hợp lệ | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-09** | Lọc theo trạng thái không hợp lệ | Không có | Gửi `GET /api/v1/orders/me?status=INVALID_STATUS` | `400 Bad Request` (`ValidationPipe` từ chối enum không hợp lệ) | Lỗi | UC-ORDER-HISTORY | GET /api/v1/orders/me | Chưa chạy | - |
| **TC-HIS-10** | Lấy chi tiết đơn hàng của chính mình | Đơn hàng thuộc sở hữu của người dùng đang đăng nhập | Gửi `GET /api/v1/orders/:id` với ID đơn thuộc user | `200 OK`, trả về đầy đủ chi tiết đơn: danh sách món, phụ thu size, topping, thanh toán, điểm thưởng | Hợp lệ | UC-ORDER-HISTORY | GET /api/v1/orders/:id | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-11** | Lấy chi tiết đơn của người dùng khác | Đơn hàng thuộc sở hữu của user B, user A gửi yêu cầu | Gửi `GET /api/v1/orders/:id` với ID đơn thuộc user B nhưng JWT của user A | `404 Not Found`: `{ success: false, statusCode: 404, message: "Không tìm thấy đơn hàng" }` (Bảo vệ quyền riêng tư, tránh lộ ID) | Lỗi | UC-ORDER-HISTORY | GET /api/v1/orders/:id | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |
| **TC-HIS-12** | Lấy chi tiết đơn với ID không tồn tại | ID đơn hàng không tồn tại trong CSDL | Gửi `GET /api/v1/orders/:id` với ID ngẫu nhiên | `404 Not Found`: `{ success: false, statusCode: 404, message: "Không tìm thấy đơn hàng" }` | Lỗi | UC-ORDER-HISTORY | GET /api/v1/orders/:id | Chưa chạy | backend/src/modules/orders/history/history.service.spec.ts |

---

### 2.2 Backend API Hủy Đơn Tests (`POST /api/v1/orders/:id/cancel`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-HIS-CN-01** | Hủy đơn đang ở trạng thái `PENDING` | Đơn hàng ở trạng thái `PENDING` thuộc sở hữu của user | Gửi `POST /api/v1/orders/:id/cancel` kèm JWT chính chủ | `200 OK`, đơn chuyển sang `CANCELLED`, hoàn trả số lượng tồn kho sản phẩm (`stock += quantity, version += 1`) và topping trong database | Hợp lệ | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | backend/test/orders-concurrency.e2e-spec.ts |
| **TC-HIS-CN-02** | Hủy đơn đang ở trạng thái `PAYMENT_FAILED` | Đơn hàng ở trạng thái `PAYMENT_FAILED` thuộc sở hữu của user | Gửi `POST /api/v1/orders/:id/cancel` khi thanh toán bị lỗi | `200 OK`, đơn chuyển sang `CANCELLED`, hoàn trả tồn kho thành công | Hợp lệ | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | backend/src/modules/orders/order-state.spec.ts |
| **TC-HIS-CN-03** | Chặn hủy đơn đã thanh toán (`PAID`) | Đơn hàng đã ở trạng thái `PAID` | Gửi `POST /api/v1/orders/:id/cancel` cho đơn đã thanh toán | `409 Conflict`: `{ success: false, statusCode: 409, message: "Đơn hàng ở trạng thái PAID không thể hủy" }` | Lỗi | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | backend/test/orders-concurrency.e2e-spec.ts |
| **TC-HIS-CN-04** | Chặn hủy đơn đã hoàn tất (`COMPLETED`) | Đơn hàng đã hoàn tất giao nước (`COMPLETED`) | Gửi `POST /api/v1/orders/:id/cancel` cho đơn đã giao | `409 Conflict`: `{ success: false, statusCode: 409, message: "Đơn hàng ở trạng thái COMPLETED không thể hủy" }` | Lỗi | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | backend/src/modules/orders/order-state.spec.ts |
| **TC-HIS-CN-05** | Hủy lặp lại 2 lần liên tiếp | Đơn đã ở trạng thái `CANCELLED` | Gửi `POST /api/v1/orders/:id/cancel` lần thứ 2 | `409 Conflict`: `{ success: false, statusCode: 409, message: "Đơn hàng ở trạng thái CANCELLED không thể hủy" }`, kho không bị hoàn 2 lần | Lỗi | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | backend/test/orders-concurrency.e2e-spec.ts |
| **TC-HIS-CN-06** | Hủy đơn của người dùng khác | Đơn hàng thuộc user B, user A gửi yêu cầu hủy | Gửi `POST /api/v1/orders/:id/cancel` với JWT của người dùng khác | `404 Not Found`: `{ success: false, statusCode: 404, message: "Không tìm thấy đơn hàng" }` (Bảo vệ quyền sở hữu, không rò rỉ ID) | Lỗi | UC-ORDER-CANCEL | POST /api/v1/orders/:id/cancel | Chưa chạy | - |

---

### 2.3 Frontend UI Tests (`/orders` & `/orders/:id`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Thao tác người dùng | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-HIS-UI-01** | Chuyển hướng khi chưa đăng nhập | Chưa đăng nhập (không có token trong storage/state) | Truy cập trực tiếp URL `/orders` | Hook `useRequireAuth` tự động chuyển hướng người dùng sang `/auth/login?next=/orders` | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-02** | Hiển thị danh sách lịch sử rỗng | Tài khoản đã đăng nhập nhưng chưa từng đặt đơn nào | Mở trang `/orders` | Hiển thị thông báo với tiêu đề *"Chưa có đơn hàng nào"*, mô tả *"Bạn chưa đặt ly cà phê nào. Hãy khám phá thực đơn thơm nồng của BrewLite ngay hôm nay nhé!"* và nút *"Khám phá thực đơn"* | Biên | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-03** | Chuyển đổi các Tab trạng thái | Người dùng có nhiều đơn hàng ở các trạng thái khác nhau | Bấm chọn tab *"Chờ thanh toán"* hoặc *"Đã hủy"* trên thanh tab `TABS` | Giao diện chuyển tab đang chọn, gọi lại API kèm tham số `status` tương ứng, cập nhật danh sách đơn theo tab và đặt lại `page = 1` | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-04** | Điều hướng phân trang | Danh sách đơn hàng có nhiều hơn 1 trang (`hasNextPage = true`) | Bấm nút *"Trang sau"* ở chân danh sách đơn | Tăng `page = page + 1`, tải và hiển thị danh sách đơn của trang tiếp theo | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-05** | Bấm xem chi tiết một đơn hàng | Đang ở trang `/orders` có danh sách đơn | Bấm nút *"Xem chi tiết"* tại một card đơn hàng | Chuyển hướng người dùng sang trang chi tiết `/orders/:id` | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-06** | Hiển thị banner thanh toán thành công | Vừa hoàn tất thanh toán từ cổng checkout, URL chứa query `?paid=1` | Trang chi tiết `/orders/:id?paid=1` được mở | Hiển thị banner màu xanh nổi bật chúc mừng với tiêu đề *"Thanh toán thành công!"* và mô tả *"Đơn hàng đã được chuyển thẳng tới quầy pha chế tự động. Bạn vui lòng tới nhận món sau 3-5 phút nhé!"* | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-07** | Hiển thị huy hiệu trạng thái (Badge) | Đơn hàng ở các trạng thái khác nhau | Quan sát component `<OrderStatusBadge />` | Hiển thị đúng nhãn: PENDING (*"Chờ thanh toán"*), PAID (*"Đã thanh toán"*), PREPARING (*"Đang pha chế"*), READY (*"Sẵn sàng nhận"*), COMPLETED (*"Hoàn tất"*), PAYMENT_FAILED (*"Thanh toán thất bại"*), CANCELLED (*"Đã hủy"*) | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |
| **TC-HIS-UI-08** | Thực hiện hủy đơn từ trang chi tiết | Đơn hàng đang ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` | Bấm nút *"Hủy đơn"* (nút chuyển sang *"Đang hủy..."*) | Gọi API `POST /api/v1/orders/:id/cancel`, khi thành công badge trạng thái cập nhật sang *"Đã hủy"*, nút hủy đơn bị ẩn đi | Hợp lệ | UC-ORDER-CANCEL | FE-only | Chưa chạy | - |
| **TC-HIS-UI-09** | Nút quay lại và tiếp tục đặt món | Đang ở trang chi tiết đơn hàng `/orders/:id` | Quan sát các nút điều hướng ở chân trang | Nút *"Quay lại danh sách đơn"* dẫn về `/orders`, nút *"Tiếp tục đặt món"* dẫn về `/menu` | Hợp lệ | UC-ORDER-HISTORY | FE-only | Chưa chạy | - |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Bảo mật danh tính:** Tuyệt đối không cho phép người dùng xem hoặc hủy đơn hàng của người dùng khác (đều trả `404 Not Found` với thông điệp `"Không tìm thấy đơn hàng"`).
- **Tính toàn vẹn kho:** Khi đơn bị hủy, số lượng sản phẩm và topping bắt buộc phải được hoàn trả lại kho trong cùng một transaction.
- **Trải nghiệm phân trang:** Phân trang mượt mà, hiển thị đúng tổng số trang và không cho phép bấm vượt quá trang hợp lệ.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-25):** Thiết lập danh mục test cases cho Order History (`GET /api/v1/orders/me`, `GET /api/v1/orders/:id`, `POST /api/v1/orders/:id/cancel` & UI `/orders`, `/orders/:id`), bổ sung các cột metadata, ánh xạ mã lỗi/thông điệp từ `history.service.ts` và đối chiếu nguyên văn chuỗi giao diện (`"Chưa có đơn hàng nào"`, `"Đã hủy"`, `"Hủy đơn"`).
