# Test Cases: Auth (Xác thực & Phân quyền)

> **Feature:** Auth | **Owner:** Phạm Minh Chiến | **Phiên bản:** v1.0  
> **Phạm vi kiểm thử:** Kiểm thử API đăng ký (`POST /api/v1/auth/register`), đăng nhập (`POST /api/v1/auth/login`), cơ chế bảo vệ route bằng `JwtAuthGuard` phía Backend NestJS, băm mật khẩu bcrypt (10 rounds), và trải nghiệm xác thực phía Frontend Next.js (`/auth/login`, `/auth/register`, hook `useRequireAuth`).

---

## 1. PHẠM VI & MỤC TIÊU KIỂM THỬ

1. **Backend API Đăng ký (`POST /api/v1/auth/register`):**
   - Xác thực định dạng email, bắt buộc mật khẩu từ 6 ký tự trở lên qua `RegisterDto`.
   - Kiểm tra chuẩn hóa email (`trim().toLowerCase()`).
   - Kiểm tra chống trùng lặp email (`409 Conflict`).
   - Kiểm tra băm mật khẩu an toàn với bcrypt (10 rounds), không bao giờ lưu hay trả về `passwordHash`.
   - Cấp phát Access Token JWT và thông tin người dùng an toàn (`id, email, fullName, loyaltyPoints`).
2. **Backend API Đăng nhập (`POST /api/v1/auth/login`):**
   - Kiểm tra đối chiếu thông tin đăng nhập với `bcrypt.compare`.
   - Trả về `401 Unauthorized` với thông điệp chung `"Email hoặc mật khẩu không chính xác"` khi sai email hoặc mật khẩu.
   - Cấp phát JWT Access Token mang payload `{ sub: user.id, email: user.email }`.
3. **Cơ chế Bảo vệ Route (`JwtAuthGuard`):**
   - Kiểm tra bắt buộc header `Authorization: Bearer <token>`.
   - Trả về `401 Unauthorized` với thông điệp `"Vui lòng đăng nhập để tiếp tục"` khi thiếu token, token hết hạn hoặc sai chữ ký.
4. **Frontend UI & Hook (`/auth/login`, `/auth/register`, `useRequireAuth`):**
   - Kiểm tra chuyển hướng tự động khi chưa đăng nhập sang `/auth/login?next=<currentUrl>`.
   - Kiểm tra nút điền nhanh tài khoản demo (`demo@brewlite.test`).
   - Kiểm tra validate form phía client (mật khẩu xác nhận khớp, email hợp lệ).
   - Kiểm tra lưu token vào `useAuthStore` và chuyển tiếp sau đăng nhập thành công.

---

## 2. DANH MỤC TEST CASES

### 2.1 Backend API Tests (`POST /api/v1/auth/register` & `POST /api/v1/auth/login`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-AUTH-01** | Đăng ký tài khoản thành công (TS-FR-04-01) | Email chưa tồn tại trong CSDL | Gửi `POST /api/v1/auth/register` với `email: "user@example.com"`, `password: "password123"`, `fullName: "Nguyễn Văn A"` | `201 Created`, CSDL tạo user mới có `passwordHash` (bcrypt 10 rounds), `loyaltyPoints = 0`. API trả về `{ success: true, statusCode: 201, data: { accessToken, user: { id, email, fullName, loyaltyPoints } } }` | Hợp lệ | UC-AUTH-REGISTER | POST /api/v1/auth/register | Chưa chạy | - |
| **TC-AUTH-02** | Dữ liệu đăng ký không hợp lệ (TS-FR-04-02) | Không có | Gửi `POST /api/v1/auth/register` với email sai format (`"not-email"`), hoặc password ngắn (`"12345"`), hoặc email rỗng | `400 Bad Request`: `ValidationPipe` từ chối kèm thông điệp `"Email không hợp lệ"`, `"Mật khẩu phải có độ dài từ 6 ký tự trở lên"`, hoặc `"Email không được để trống"` | Lỗi | UC-AUTH-REGISTER | POST /api/v1/auth/register | Chưa chạy | - |
| **TC-AUTH-03** | Đăng ký với email đã tồn tại (TS-FR-04-03) | CSDL đã có tài khoản mang email `"existing@brewlite.test"` | Gửi `POST /api/v1/auth/register` với `email: "existing@brewlite.test"` (kể cả có khoảng trắng hay chữ hoa) | `409 Conflict`: `{ success: false, statusCode: 409, message: "Email này đã được sử dụng" }` | Lỗi | UC-AUTH-REGISTER | POST /api/v1/auth/register | Chưa chạy | - |
| **TC-AUTH-04** | Đăng nhập thành công và nhận JWT (TS-FR-04-04) | Tài khoản tồn tại (`email: "demo@brewlite.test"`, `password: "Demo@12345"`) | Gửi `POST /api/v1/auth/login` với email và password chính xác | `200 OK`, trả về `{ success: true, statusCode: 200, data: { accessToken, user: { id, email, fullName, loyaltyPoints } } }`. Token JWT mang payload `{ sub: user.id, email: user.email }` | Hợp lệ | UC-AUTH-LOGIN | POST /api/v1/auth/login | Chưa chạy | - |
| **TC-AUTH-05** | Đăng nhập sai thông tin (TS-FR-04-05) | Không có | Gửi `POST /api/v1/auth/login` với email không tồn tại hoặc mật khẩu sai | `401 Unauthorized`: `{ success: false, statusCode: 401, message: "Email hoặc mật khẩu không chính xác" }` | Lỗi | UC-AUTH-LOGIN | POST /api/v1/auth/login | Chưa chạy | - |
| **TC-AUTH-06** | Mật khẩu được băm bằng bcrypt 10 rounds (TS-FR-04-06) | Người dùng mới đăng ký thành công | Truy vấn trực tiếp cột `password_hash` trong bảng `users` | Giá trị là chuỗi băm chuẩn bcrypt (`$2b$10$...`), tuyệt đối không lưu plaintext; `passwordHash` không bao giờ trả về client | Hợp lệ | UC-AUTH-REGISTER | POST /api/v1/auth/register | Chưa chạy | - |
| **TC-AUTH-07** | Bảo vệ route cần xác thực bằng JwtAuthGuard (TS-FR-04-07) | Client chưa gửi Bearer token | Gửi `POST /api/v1/orders` hoặc `GET /api/v1/orders/me` không có header `Authorization` | `401 Unauthorized`: `{ success: false, statusCode: 401, message: "Vui lòng đăng nhập để tiếp tục" }` | Lỗi | UC-AUTH-GUARD | POST /api/v1/orders | Chưa chạy | - |
| **TC-AUTH-08** | Token JWT hết hạn hoặc sai chữ ký (TS-FR-04-08) | Client sở hữu token JWT đã hết hạn hoặc bị sửa đổi chữ ký | Gửi request đến route bảo vệ kèm header `Authorization: Bearer <invalid_token>` | `401 Unauthorized`: `JwtAuthGuard` từ chối kèm thông điệp `"Vui lòng đăng nhập để tiếp tục"` | Lỗi | UC-AUTH-GUARD | GET /api/v1/orders/me | Chưa chạy | - |

---

### 2.2 Frontend UI & Hook Tests (`/auth/login`, `/auth/register`, `useRequireAuth`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Thao tác người dùng | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-AUTH-UI-01** | Điều hướng đăng nhập khi chưa xác thực (TS-FR-04-09) | Chưa đăng nhập (`token = null`), truy cập route yêu cầu đăng nhập | Truy cập trực tiếp URL `/orders` | Hook `useRequireAuth` tự động chuyển hướng sang `/auth/login?next=%2Forders`, giỏ hàng được bảo toàn | Hợp lệ | UC-AUTH-LOGIN | FE-only | Chưa chạy | - |
| **TC-AUTH-UI-02** | Đăng nhập thành công và chuyển về trang trước (`next`) | Đang ở trang `/auth/login?next=%2Fcheckout` | Nhập tài khoản hợp lệ (hoặc bấm nút *"Điền tài khoản Demo (demo@brewlite.test)"*) và bấm *"Đăng nhập"* | Nút hiển thị *"Đang xác thực..."*, lưu token và user vào `useAuthStore`, sau đó điều hướng về `/checkout` | Hợp lệ | UC-AUTH-LOGIN | FE-only | Chưa chạy | - |
| **TC-AUTH-UI-03** | Đăng nhập thất bại hiển thị cảnh báo lỗi | Đang ở trang `/auth/login` | Nhập sai mật khẩu và bấm *"Đăng nhập"* | Hiển thị khung thông báo lỗi màu đỏ nguyên văn: *"Email hoặc mật khẩu không chính xác"*, giữ nguyên form | Lỗi | UC-AUTH-LOGIN | FE-only | Chưa chạy | - |
| **TC-AUTH-UI-04** | Đăng ký tài khoản thành công từ giao diện | Đang ở trang `/auth/register` | Nhập họ tên, email mới, mật khẩu ≥ 6 ký tự, nhập lại mật khẩu khớp và bấm *"Đăng ký tài khoản"* | Nút hiển thị *"Đang tạo tài khoản..."*, lưu token và user vào `useAuthStore`, sau đó chuyển hướng về trang `/menu` | Hợp lệ | UC-AUTH-REGISTER | FE-only | Chưa chạy | - |
| **TC-AUTH-UI-05** | Báo lỗi mật khẩu xác nhận không khớp | Đang ở trang `/auth/register` | Nhập mật khẩu `"123456"` nhưng nhập xác nhận mật khẩu `"123457"` và bấm submit | Chặn gửi request, hiển thị thông báo lỗi màu đỏ nguyên văn: *"Mật khẩu xác nhận không khớp"* | Lỗi | UC-AUTH-REGISTER | FE-only | Chưa chạy | - |
| **TC-AUTH-UI-06** | Báo lỗi email đã được đăng ký | Đang ở trang `/auth/register` | Nhập email đã tồn tại trong hệ thống và bấm *"Đăng ký tài khoản"* | Hiển thị thông báo lỗi nguyên văn: *"Email đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác."* | Lỗi | UC-AUTH-REGISTER | FE-only | Chưa chạy | - |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Bảo mật tuyệt đối:** Mật khẩu bắt buộc phải được băm bằng bcrypt (10 rounds). Tuyệt đối không bao giờ trả trường `passwordHash` ra ngoài client trong bất kỳ endpoint nào.
- **Tính toàn vẹn phiên làm việc:** Token JWT mang đúng định danh `sub: user.id` và `email`, bảo vệ an toàn các route nhạy cảm.
- **Trải nghiệm người dùng:** Các trang đăng nhập/đăng ký hỗ trợ tham số `next` để tự động quay lại đúng màn hình trước đó của người dùng sau khi xác thực thành công.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-25):** Thiết lập danh mục test cases chi tiết cho phân hệ Auth (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `JwtAuthGuard` & UI `/auth/login`, `/auth/register`), chuẩn hóa metadata và chuỗi giao diện nguyên văn từ mã nguồn.
