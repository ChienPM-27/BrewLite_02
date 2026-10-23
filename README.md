# ☕ BrewLite – Hệ Thống Đặt Cà Phê & Thanh Toán Không Tiền Mặt

> **Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – Năm học 2026–2027  
> **Kiến trúc Monorepo:** 
> - **Backend:** NestJS 11 + Prisma ORM 6 + PostgreSQL 16 (Docker)
> - **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS 3 + Zustand
> - **Thiết kế:** Design System **Warm Roasted Modern** (tông nâu rang mộc, kem sữa, bạc hà, đổ bóng elevation ấm)

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG (QUICK START)

Dành cho thành viên clone dự án về chạy trên máy mới:

### Bước 1: Khởi động Cơ sở dữ liệu PostgreSQL (Docker)
Khởi động ứng dụng **Docker Desktop**, sau đó mở terminal tại thư mục gốc của dự án (`BrewLite/`):
```bash
docker compose up -d
```
> Lệnh này sẽ tải image PostgreSQL 16 và chạy database `brewlite_db` tại cổng `localhost:5432`.

### Bước 2: Cài đặt và Khởi động Backend (Port 4000)
Mở một cửa sổ Terminal mới:
```bash
cd backend
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```
- **REST API Base URL:** `http://localhost:4000/api/v1`
- **Tài liệu API Swagger/Contract:** Xem trong thư mục `docs/`

### Bước 3: Cài đặt và Khởi động Frontend (Port 3000)
Mở thêm một cửa sổ Terminal khác:
```bash
cd frontend
npm install
npm run dev
```
- **Giao diện người dùng Web:** `http://localhost:3000`

---

## 🔑 TÀI KHOẢN & DỮ LIỆU DEMO

Hệ thống đã nạp sẵn dữ liệu mẫu khi chạy `npm run prisma:seed`:
- **Tài khoản thành viên thử nghiệm:**
  - Email: `demo@brewlite.test`
  - Mật khẩu: `Demo@12345`
  - *(Trên trang Đăng nhập có sẵn nút bấm "Điền tài khoản Demo" tiện lợi)*
- **Mã ưu đãi khuyến mãi:**
  - Nhập mã `BREWLITE` tại giỏ hàng hoặc bước đặt hàng để nhận giảm giá **15.000đ** cho đơn từ 50.000đ.
- **Mô phỏng lỗi thanh toán:**
  - Có thể kích hoạt `NEXT_PUBLIC_DEMO_MODE=true` trong `frontend/.env.local` để hiển thị checkbox mô phỏng thanh toán thất bại (`X-Mock-Outcome: FAILED`).

---

## 🛠️ CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN (END-TO-END)

1. **Xác thực & Thành viên (`/auth`):**
   - Đăng nhập, đăng ký tài khoản với JWT an toàn.
   - Cơ chế bảo vệ đường dẫn `useRequireAuth`, ngăn chặn open-redirect với đường dẫn an toàn (`next.startsWith('/') && !next.startsWith('//')`).
   - Tích lũy điểm thưởng thành viên (BrewPoints) trên từng đơn thanh toán thành công.
2. **Thực đơn & Tùy biến món (`/menu`, `/products/:id`):**
   - Nạp dữ liệu sản phẩm mở bán thời gian thực từ database.
   - Tùy chỉnh kích cỡ (Size S/M/L) và tối đa 3 topping đính kèm.
   - Modal xem nhanh và modal chỉnh sửa món trực tiếp trong giỏ hàng.
3. **Giỏ hàng (`/cart`):**
   - Quản lý trạng thái bằng Zustand persist lưu cục bộ (`localStorage`).
   - Tự động đồng bộ số lượng, tính giá tạm tính, áp dụng mã ưu đãi.
4. **Xác nhận đặt hàng (`/checkout`):**
   - Thuật toán băm chữ ký giỏ hàng `computeCartSignature`: tái sử dụng đơn PENDING cũ nếu giỏ không đổi, tự động hủy và tạo đơn mới nếu giỏ hàng có cập nhật.
   - Ngăn chặn đặt trùng lặp (double-click guard) và kiểm soát tranh chấp kho hàng (Optimistic Concurrency Control).
5. **Cổng thanh toán không tiền mặt (`/checkout/payment`):**
   - Chọn phương thức: Ví điện tử (MoMo, ZaloPay, VietQR) hoặc Thẻ ngân hàng (NAPAS, Visa, Mastercard).
   - Cơ chế `Idempotency-Key` với `useRef`: tự động gửi cùng key khi lỗi mạng/timeout để chống trừ tiền 2 lần; chỉ cấp key mới khi server xác nhận thất bại hoặc đổi phương thức thanh toán.
   - Fallback an toàn tự sinh key chuẩn trên cả môi trường non-secure context (HTTP LAN).
6. **Lịch sử & Chi tiết đơn hàng (`/orders`, `/orders/:id`):**
   - Phân loại đơn hàng theo tab trạng thái (Chờ thanh toán, Đang xử lý, Hoàn tất, Đã hủy) kèm phân trang.
   - Chi tiết danh sách món, phụ thu topping, điểm tích lũy `+N điểm tích lũy`, và lịch sử các lượt giao dịch thanh toán.
   - Cho phép thanh toán tiếp hoặc hủy đơn với các đơn chưa thanh toán.

---

## 🧪 CHẠY KIỂM THỬ (TESTING)

- **Unit test Backend (không cần DB):**
  ```bash
  cd backend
  npm test
  ```
- **Kiểm thử tranh chấp kho & thanh toán đồng thời:**
  ```bash
  cd backend
  npm run test:concurrency
  ```
  *(Yêu cầu Docker DB và backend `npm run start:dev` đang chạy. Script tạm chỉnh kho "Bạc xỉu" rồi khôi phục, nên chạy lại `npm run prisma:seed` sau khi test)*.
- **Kiểm tra TypeScript & Production Build Frontend:**
  ```bash
  cd frontend
  npx tsc --noEmit
  npm run build
  ```

---

## 📁 CẤU TRÚC MONOREPO

```
BrewLite/
├── backend/                      # Ứng dụng NestJS REST API (Port 4000)
│   ├── src/
│   │   ├── common/               # Interceptors, Filters, Guards
│   │   ├── modules/
│   │   │   ├── auth/             # Xác thực người dùng & JWT
│   │   │   ├── products/         # Danh mục sản phẩm & Topping
│   │   │   ├── orders/           # Đặt hàng, State Machine, Hủy đơn, Lịch sử
│   │   │   └── payments/         # Thanh toán Idempotency & Mock Gateway
│   │   └── prisma/               # Prisma Service
│   ├── prisma/schema.prisma      # Định nghĩa mô hình cơ sở dữ liệu
│   └── requests/smoke-gd1.http   # File request HTTP kiểm thử nhanh REST Client
├── frontend/                     # Ứng dụng Next.js 15 App Router (Port 3000)
│   ├── src/
│   │   ├── app/                  # Route pages: /, /menu, /cart, /checkout, /orders, /auth
│   │   ├── components/           # UI components, layout, features
│   │   ├── hooks/                # useRequireAuth, useHydrated
│   │   ├── lib/                  # api-client, format-currency, idempotency
│   │   ├── services/             # auth, product, order, payment services
│   │   └── store/                # useAuthStore, useCartStore (Zustand)
│   └── design/design-system.md   # Đặc tả Design System "Warm Roasted Modern"
├── docs/                         # Tài liệu đặc tả & Hợp đồng API
│   ├── auth/                     # Use-case & Contract Auth
│   ├── cart/                     # Use-case & Contract Giỏ hàng
│   ├── order/                    # Đặc tả Đặt hàng & Concurrency Control
│   ├── payment/                  # Idempotency & Cổng thanh toán
│   ├── order-history/            # Lịch sử đơn hàng & Tra cứu chi tiết
│   ├── git-convention.md         # Quy chuẩn Git & Commit
│   └── checklist-review.md       # Tiêu chí review code
├── docker-compose.yml            # Khởi chạy PostgreSQL Container
└── README.md
```
