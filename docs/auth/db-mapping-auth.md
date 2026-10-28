# 🗄️ DATABASE MAPPING: AUTH MODULE

> **Feature:** Auth (Quản lý tài khoản & Xác thực người dùng)  
> **Tác giả:** Auth Team  
> **Phiên bản:** v1.0  
> **Mục tiêu:** Ánh xạ chi tiết từ API Request / Business Logic sang bảng vật lý PostgreSQL `users` và Prisma Model `User` trong `backend/prisma/schema.prisma`.

---

## 1. TỔNG QUAN THỰC THỂ LIÊN QUAN

Module Auth tương tác trực tiếp với bảng dữ liệu người dùng trong cơ sở dữ liệu:
* **Bảng vật lý:** `users` (Prisma Model: `User`).

Bảng `users` đóng vai trò là thực thể gốc (parent entity) liên kết đến:
* `orders`: Các đơn hàng do người dùng tạo (`User.orders`).
* `loyalty_transactions`: Nhật ký tích điểm và sử dụng điểm loyalty của người dùng (`User.loyaltyTransactions`).

---

## 2. BẢNG MAPPING CHI TIẾT

### 2.1 Bảng `users` (Prisma Model: `User`)

| Thuộc tính API / Nguồn | Prisma Field | Cột Database | Kiểu dữ liệu | Ràng buộc / Ý nghĩa |
| :--- | :--- | :--- | :--- | :--- |
| Hệ thống sinh tự động | `id` | `id` | `String` | Primary Key (`@default(cuid())`) |
| Request `email` | `email` | `email` | `String` | Unique (`@unique`), bắt buộc, chuẩn hóa chữ thường |
| Request `password` | `passwordHash` | `password_hash` | `String` | Bắt buộc, chuỗi băm Bcrypt (`salt rounds = 10`) |
| Request `fullName` | `fullName` | `full_name` | `String?` | Tùy chọn (Nullable) |
| Khởi tạo ban đầu | `role` | `role` | `Role` (Enum) | Bắt buộc, mặc định `CUSTOMER` (`Role.CUSTOMER`). Giá trị: `CUSTOMER`, `ADMIN`, `BARISTA` |
| Khởi tạo ban đầu | `loyaltyPoints` | `loyalty_points` | `Int` | Mặc định `0` (`@default(0)`) |
| DB gán tự động | `createdAt` | `created_at` | `DateTime` | Thời gian đăng ký tài khoản (`@default(now())`) |
| DB cập nhật tự động | `updatedAt` | `updated_at` | `DateTime` | Thời gian cập nhật thông tin (`@updatedAt`) |

---

## 3. QUY TRÌNH NGHIỆP VỤ & THAO TÁC PRISMA

### 3.1 Quy trình Đăng ký tài khoản (Register Workflow)

1. **Chuẩn hóa dữ liệu đầu vào:**
   - Email được loại bỏ khoảng trắng hai đầu và chuyển toàn bộ thành chữ thường:
     ```typescript
     const normalizedEmail = dto.email.trim().toLowerCase();
     ```
2. **Kiểm tra trùng lặp email (Email Uniqueness Check):**
   - Thực thi câu lệnh truy vấn tìm kiếm người dùng theo email duy nhất:
     ```typescript
     const existingUser = await this.prisma.user.findUnique({
       where: { email: normalizedEmail },
     });
     if (existingUser) {
       throw new ConflictException('Email này đã được sử dụng');
     }
     ```
3. **Băm mật khẩu (Bcrypt Hashing):**
   - Mật khẩu thô không bao giờ được lưu trực tiếp vào cơ sở dữ liệu.
   - Sử dụng thư viện `bcrypt` với **10 salt rounds**:
     ```typescript
     const passwordHash = await bcrypt.hash(dto.password, 10);
     ```
4. **Tạo bản ghi người dùng mới (User Creation):**
   - Tạo mới người dùng với điểm thưởng ban đầu bằng 0 và vai trò mặc định CUSTOMER:
     ```typescript
     const user = await this.prisma.user.create({
       data: {
         email: normalizedEmail,
         passwordHash,
         fullName: dto.fullName?.trim() || null,
         role: Role.CUSTOMER,
         loyaltyPoints: 0,
       },
     });
     ```
5. **Ký và sinh Access Token:**
   - Sử dụng `jwtService.signAsync({ sub: user.id, email: user.email, role: user.role })`.

---

### 3.2 Quy trình Đăng nhập (Login Workflow)

1. **Chuẩn hóa email:**
   - `const normalizedEmail = dto.email.trim().toLowerCase();`
2. **Truy vấn người dùng:**
   - Tìm kiếm người dùng trong cơ sở dữ liệu:
     ```typescript
     const user = await this.prisma.user.findUnique({
       where: { email: normalizedEmail },
     });
     if (!user) {
       throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
     }
     ```
3. **Xác minh mật khẩu:**
   - Đối chiếu mật khẩu nhập vào với mật khẩu đã băm:
     ```typescript
     const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
     if (!isPasswordValid) {
       throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
     }
     ```
4. **Phát hành Access Token:**
   - Sinh JWT token mang định danh `sub: user.id`.

---

## 4. NGUYÊN TẮC BẢO MẬT & DỮ LIỆU BẢO VỆ

* **Mật khẩu người dùng (`passwordHash`):**
  - Tuyệt đối **KHÔNG BAO GIỜ** được trả về trong bất kỳ phản hồi API nào (kể cả đăng ký hay đăng nhập).
  - Dữ liệu `user` trả về cho Frontend chỉ bao gồm các trường an toàn:
    ```typescript
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      loyaltyPoints: user.loyaltyPoints,
    }
    ```
* **Bảo vệ toàn vẹn email:**
  - Cột `email` có chỉ mục `UNIQUE` trong PostgreSQL (`users_email_key`).
  - Nếu xảy ra điều kiện tranh chấp ghi đồng thời (race condition), lỗi vi phạm khóa duy nhất `P2002` của Prisma sẽ được bắt bởi `AllExceptionsFilter` và trả về `409 Conflict`.
