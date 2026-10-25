# API Contract: Authentication

> **Feature:** Auth (Xác thực & Tài khoản người dùng) | **Owner:** Auth Team | **Version:** v1.1 (Official Contract aligned with NestJS & Next.js)

> **Lưu ý:** Hợp đồng API được xây dựng dựa trên backend NestJS và Prisma schema hiện tại. Toàn bộ response thành công và lỗi đều tuân thủ kiến trúc bọc chung (`TransformInterceptor` và `AllExceptionsFilter`).

---

## 1. POST /auth/register — Đăng ký tài khoản mới

| Mục | Nội dung |
|---|---|
| **Mô tả** | Đăng ký tài khoản khách hàng mới bằng email, mật khẩu và họ tên (tùy chọn). Sau khi đăng ký thành công, hệ thống tự động băm mật khẩu bằng `bcrypt`, lưu vào database, tạo JWT access token và trả về thông tin người dùng cùng token để người dùng đăng nhập luôn. |
| **Auth** | **Public** (Không yêu cầu xác thực). |
| **Content-Type** | `application/json` |
| **Endpoint** | `POST /api/v1/auth/register` |

### 1.1 Request Headers
```http
Content-Type: application/json
Accept: application/json
```

### 1.2 Request Body
```json
{
  "email": "khachhang@example.com",
  "password": "Password123",
  "fullName": "Nguyễn Văn A"
}
```

### 1.3 Giải thích các trường
| Trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa |
|---|---|:---:|---|
| `email` | String | Có | Địa chỉ email người dùng (chuẩn hóa trim và chuyển chữ thường). |
| `password` | String | Có | Mật khẩu tài khoản (tối thiểu 6 ký tự). |
| `fullName` | String | Không | Họ và tên khách hàng (tự động trim khoảng trắng thừa nếu có). |

### 1.4 Quy tắc kiểm tra dữ liệu đầu vào (DTO Validation - `RegisterDto`)
| Trường | Quy tắc Class Validator | Thông điệp lỗi khi vi phạm |
|---|---|---|
| `email` | `@IsEmail()` | `"Email không hợp lệ"` |
| `email` | `@IsNotEmpty()` | `"Email không được để trống"` |
| `email` | `@Transform(...)` | Tự động `trim().toLowerCase()` chuỗi trước khi kiểm tra |
| `password` | `@IsString()` | `"Mật khẩu phải là chuỗi ký tự"` |
| `password` | `@MinLength(6)` | `"Mật khẩu phải có độ dài từ 6 ký tự trở lên"` |
| `fullName` | `@IsOptional()`, `@IsString()` | `"Họ và tên phải là chuỗi ký tự"` |
| `fullName` | `@Transform(...)` | Tự động `trim()` chuỗi |

### 1.5 Phản hồi thành công (Success Response — `201 Created`)
Bọc qua `TransformInterceptor` chuẩn của hệ thống:
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmv19usr000194rc6vgebmp1",
      "email": "khachhang@example.com",
      "fullName": "Nguyễn Văn A",
      "loyaltyPoints": 0
    }
  },
  "timestamp": "2026-10-25T08:00:00.000Z"
}
```

### 1.6 Phản hồi lỗi (Error Responses)
* **400 Bad Request** — Dữ liệu không thỏa mãn DTO Validation:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "Email không hợp lệ",
    "Mật khẩu phải có độ dài từ 6 ký tự trở lên"
  ],
  "timestamp": "2026-10-25T08:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```
* **409 Conflict** — Email đã được đăng ký trước đó (`ConflictException`):
```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email này đã được sử dụng",
  "timestamp": "2026-10-25T08:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

## 2. POST /auth/login — Đăng nhập tài khoản

| Mục | Nội dung |
|---|---|
| **Mô tả** | Xác thực thông tin đăng nhập của khách hàng thông qua email và mật khẩu. Đối chiếu mật khẩu đã băm bằng `bcrypt.compare()`. Trả về JWT access token dùng cho các request cần xác thực. |
| **Auth** | **Public** (Không yêu cầu xác thực). |
| **Content-Type** | `application/json` |
| **Endpoint** | `POST /api/v1/auth/login` |

### 2.1 Request Headers
```http
Content-Type: application/json
Accept: application/json
```

### 2.2 Request Body
```json
{
  "email": "khachhang@example.com",
  "password": "Password123"
}
```

### 2.3 Giải thích các trường
| Trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa |
|---|---|:---:|---|
| `email` | String | Có | Email đăng ký của tài khoản (chuẩn hóa trim và chuyển chữ thường). |
| `password` | String | Có | Mật khẩu tài khoản. |

### 2.4 Quy tắc kiểm tra dữ liệu đầu vào (DTO Validation - `LoginDto`)
| Trường | Quy tắc Class Validator | Thông điệp lỗi khi vi phạm |
|---|---|---|
| `email` | `@IsEmail()` | `"Email không hợp lệ"` |
| `email` | `@IsNotEmpty()` | `"Email không được để trống"` |
| `email` | `@Transform(...)` | Tự động `trim().toLowerCase()` |
| `password` | `@IsString()` | `"Mật khẩu phải là chuỗi ký tự"` |
| `password` | `@IsNotEmpty()` | `"Mật khẩu không được để trống"` |

### 2.5 Phản hồi thành công (Success Response — `200 OK`)
Bọc qua `TransformInterceptor`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmv19usr000194rc6vgebmp1",
      "email": "khachhang@example.com",
      "fullName": "Nguyễn Văn A",
      "loyaltyPoints": 0
    }
  },
  "timestamp": "2026-10-25T08:00:00.000Z"
}
```

### 2.6 Phản hồi lỗi (Error Responses)
* **400 Bad Request** — Dữ liệu không thỏa mãn DTO Validation:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "Email không hợp lệ",
    "Mật khẩu không được để trống"
  ],
  "timestamp": "2026-10-25T08:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```
* **401 Unauthorized** — Email không tồn tại hoặc mật khẩu sai (`UnauthorizedException`):
```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Email hoặc mật khẩu không chính xác",
  "timestamp": "2026-10-25T08:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## 3. Cách các Endpoint khác sử dụng JWT (JWT Consumption Specification)

### 3.1 Header xác thực
Mọi API bảo vệ (yêu cầu đăng nhập) trên hệ thống bắt buộc phải đính kèm token trong HTTP header:
```http
Authorization: Bearer <accessToken>
```

### 3.2 Cơ chế bảo vệ phía Backend (`JwtAuthGuard`)
- Phía Backend sử dụng NestJS Passport: `@UseGuards(JwtAuthGuard)` trên Controller hoặc từng Method:
  - `POST /api/v1/orders` (Tạo đơn hàng)
  - `POST /api/v1/orders/:id/cancel` (Hủy đơn hàng)
  - `POST /api/v1/payments` (Thanh toán đơn hàng)
  - `GET /api/v1/orders/me` (Lấy lịch sử đơn hàng của tôi)
  - `GET /api/v1/orders/:id` (Xem chi tiết đơn hàng của tôi)
- Guard tự động trích xuất token từ Authorization Bearer header qua `ExtractJwt.fromAuthHeaderAsBearerToken()`.
- Xác minh tính toàn vẹn và hạn sử dụng bằng khóa bí mật `JWT_SECRET`.

### 3.3 Payload của Token
Token JWT chứa payload tối giản theo interface `JwtPayload` (`backend/src/modules/auth/strategies/jwt.strategy.ts`):
```json
{
  "sub": "cmv19usr000194rc6vgebmp1",
  "email": "khachhang@example.com",
  "iat": 1729843200,
  "exp": 1730448000
}
```
* **`sub`**: Mã định danh duy nhất của người dùng (`User.id` - CUID).
* **`email`**: Email của người dùng.

### 3.4 Quy tắc trích xuất danh tính (Quyết định thiết kế D4)
- Controller nhận request đã xác thực qua `req.user`:
  ```typescript
  const userId = req.user.sub;
  const email = req.user.email;
  ```
- **Bảo mật tuyệt đối:** Backend trích xuất danh tính khách hàng trực tiếp từ `req.user.sub`. Tuyệt đối không chấp nhận `userId` được gửi qua request body hay query params để chống giả mạo danh tính người dùng khác.

### 3.5 Thời hạn token (Token Expiration)
- Được cấu hình linh hoạt thông qua biến môi trường `JWT_EXPIRATION` trong `AuthModule` (mặc định là `'7d'` — 7 ngày nếu không khai báo biến môi trường).

### 3.6 Xử lý lỗi xác thực
Nếu client không gửi header `Authorization`, token sai chữ ký, hoặc token đã hết hạn:
* `JwtAuthGuard` ném `UnauthorizedException` với mã HTTP `401 Unauthorized`:
```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Vui lòng đăng nhập để tiếp tục",
  "timestamp": "2026-10-25T08:00:00.000Z",
  "path": "/api/v1/orders"
}
```
Client (Next.js Frontend) khi nhận lỗi 401 sẽ tự động điều hướng người dùng về trang `/auth/login?next=<current_path>`.
