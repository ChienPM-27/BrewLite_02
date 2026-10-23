# ☕ BrewLite – Hệ Thống Đặt Cà Phê & Thanh Toán Không Tiền Mặt

> **Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – Năm học 2026–2027  
> **Kiến trúc Monorepo:** 
> - **Backend:** NestJS 11 + Prisma ORM 6 + PostgreSQL 16 (Docker)
> - **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS 3 + Zustand
> - **Thiết kế:** Design System **Warm Roasted Modern** (tông nâu rang mộc, kem sữa, bạc hà, đổ bóng elevation ấm)

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG (QUICK START)

Bạn có thể khởi chạy hệ thống theo 1 trong 2 cách dưới đây trên máy sạch (yêu cầu Docker Desktop và Node.js 20+):

### CÁCH A: Chạy toàn bộ hệ thống bằng Docker (Khuyên dùng)
Chỉ với 1 lệnh duy nhất để build và khởi chạy cả 3 dịch vụ (PostgreSQL, NestJS Backend, Next.js Frontend):

1. **Khởi động các dịch vụ:**
   ```bash
   docker compose up --build -d
   ```
   - **Postgres Database:** `localhost:5432` (tự động chạy `prisma migrate deploy`)
   - **Backend API:** `http://localhost:4000/api/v1` (Health check: `http://localhost:4000/api/v1/health`)
   - **Frontend Web UI:** `http://localhost:3000`

2. **Nạp dữ liệu mẫu (Seeding):**
   *(Dữ liệu mẫu KHÔNG tự nạp khi khởi động mặc định để tránh vô tình xóa dữ liệu. Sử dụng profile `seed` khi cần nạp dữ liệu demo ban đầu)*:
   ```bash
   docker compose --profile seed run --rm seed
   ```

3. **Dừng hệ thống:**
   ```bash
   docker compose down
   # hoặc xóa sạch cả volume dữ liệu:
   docker compose down -v
   ```

> **Lưu ý về môi trường:** Trong `docker-compose.yml`, biến `BACKEND_NODE_ENV` mặc định là `development`. Điều này cho phép header `X-Mock-Outcome` hoạt động để phục vụ demo các kịch bản lỗi thanh toán. Nếu đặt `BACKEND_NODE_ENV=production`, backend sẽ bỏ qua header này theo đúng nguyên tắc bảo mật.

---

### CÁCH B: Chạy thủ công từng phần cho Lập trình viên (Local Dev)

#### 1. Khởi động PostgreSQL qua Docker:
```bash
docker compose up -d postgres
```

#### 2. Cài đặt và chạy Backend (Port 4000):
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```
- **REST API Base URL:** `http://localhost:4000/api/v1`
- Biến môi trường mẫu trong `backend/.env.example`:
  - `PORT=4000`
  - `NODE_ENV=development`
  - `DATABASE_URL="postgresql://brewlite_admin:brewlite_secret_pass@localhost:5432/brewlite_db?schema=public"`
  - `DIRECT_URL="postgresql://brewlite_admin:brewlite_secret_pass@localhost:5432/brewlite_db?schema=public"`
  - `JWT_SECRET=brewlite_super_secret_jwt_key_2026`
  - `JWT_EXPIRATION=7d`

#### 3. Cài đặt và chạy Frontend (Port 3000):
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
- **Giao diện Web:** `http://localhost:3000`
- Biến môi trường trong `frontend/.env.local`:
  - `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
  - `NEXT_PUBLIC_DEMO_MODE=true` *(bật chế độ demo để hiển thị công cụ chọn kịch bản thanh toán MoMo/Thẻ ngân hàng)*

---

## 🔑 TÀI KHOẢN & DỮ LIỆU DEMO

Hệ thống đã nạp sẵn dữ liệu mẫu khi chạy lệnh seed (`npm run prisma:seed` hoặc qua docker seed profile):
- **Tài khoản người dùng Demo:**
  - **Email:** `demo@brewlite.test`
  - **Mật khẩu:** `Demo@12345`
  - Có sẵn **120 điểm loyalty** (BrewPoints).
  - *(Trên trang Đăng nhập có nút bấm "Điền tài khoản Demo" giúp đăng nhập nhanh).*

- **Mã ưu đãi khuyến mãi (Khớp chính xác với seed DB):**
  - `WELCOME10`: Giảm 10% giá trị đơn hàng, giảm tối đa **20.000đ**, áp dụng cho đơn từ **40.000đ**.
  - `GIAM15K`: Giảm trực tiếp **15.000đ**, áp dụng cho đơn từ **60.000đ**.

- **Chế độ Demo thanh toán (`NEXT_PUBLIC_DEMO_MODE=true`):**
  - Mở giao diện giả lập Cổng thanh toán (Mock Payment Gateway) trực quan:
    - **Ví điện tử (MoMo / VietQR):** Hiển thị mã QR động, bộ đếm ngược thời gian thanh toán và các nút mô phỏng: *Thanh toán thành công* hoặc *Thanh toán thất bại (Quá hạn/Số dư không đủ)*.
    - **Thẻ ngân hàng (NAPAS / Visa / Mastercard):** Form nhập thông tin thẻ, mã OTP xác thực và nút mô phỏng thành công/thất bại.

---

## ☕ LUỒNG DEMO END-TO-END

### Kịch bản 1: Đặt hàng & Thanh toán thành công (Happy Path)
1. **Đăng nhập:** Mở `http://localhost:3000/auth/login`, bấm "Điền tài khoản Demo" rồi bấm "Đăng nhập". Hệ thống cấp JWT và chuyển hướng đến trang Thực đơn.
2. **Chọn món & tùy biến:**
   - Vào `/menu`, chọn một món đồ uống (ví dụ: *Cà phê sữa đá*).
   - Chọn kích cỡ (Size M +5.000đ hoặc Size L +10.000đ).
   - Thêm các loại Topping yêu thích (Trân châu trắng, Thạch cà phê...).
   - Bấm "Thêm vào giỏ hàng".
3. **Giỏ hàng & Khuyến mãi:**
   - Vào `/cart`, kiểm tra danh sách món và phụ thu.
   - Nhập mã ưu đãi `WELCOME10` (nếu đơn >= 40.000đ) hoặc `GIAM15K` (nếu đơn >= 60.000đ), bấm "Áp dụng". Hệ thống tính toán mức giảm và cập nhật tổng tiền thanh toán.
   - Bấm "Tiến hành đặt hàng".
4. **Xác nhận đặt hàng:** Trang `/checkout` hiển thị tóm tắt đơn hàng. Bấm "Xác nhận đặt hàng" để tạo đơn ở trạng thái `PENDING`.
5. **Thanh toán:**
   - Trang `/checkout/payment` hiển thị lựa chọn phương thức (Ví điện tử hoặc Thẻ ngân hàng).
   - Bấm "Mở cổng thanh toán [MoMo / Thẻ ngân hàng]".
   - Trên modal cổng thanh toán giả lập, bấm **"Mô phỏng: Quét mã thành công"** (hoặc xác thực OTP).
   - Hệ thống gửi request với `Idempotency-Key` duy nhất, đơn hàng chuyển sang `PAID`, điểm thưởng thành viên được tự động tích lũy (10.000đ = 1 điểm).
6. **Xác nhận & Kiểm tra lịch sử:**
   - Màn hình thông báo "Thanh toán thành công!" kèm số điểm vừa tích lũy.
   - Vào `/orders` hoặc `/orders/:id` để xem chi tiết đơn hàng, lịch sử trạng thái và giao dịch thanh toán.

### Kịch bản 2: Thanh toán thất bại & Thử lại (Failure & Retry Path)
1. Tại bước thanh toán `/checkout/payment`, chọn phương thức và bấm mở cổng thanh toán.
2. Trên modal giả lập, bấm **"Mô phỏng: Quá hạn thanh toán / Hủy"** (hoặc chọn checkbox "Mô phỏng thanh toán thất bại").
3. Giao diện báo lỗi thanh toán, đơn hàng được cập nhật sang trạng thái `PAYMENT_FAILED`.
4. Bấm nút **"Thử lại thanh toán"**: hệ thống cấp `Idempotency-Key` mới, chuyển trạng thái đơn từ `PAYMENT_FAILED` về `PENDING`, cho phép khách hàng đổi phương thức thanh toán hoặc thử lại cho đến khi thành công.
5. Khách hàng cũng có thể chọn **"Hủy đơn hàng"**: đơn hàng chuyển sang `CANCELLED`, toàn bộ số lượng tồn kho của sản phẩm và topping được hoàn trả ngay lập tức vào database.

---

## 🧪 CHẠY KIỂM THỬ (TESTING)

### 1. Unit Test Backend (Không cần DB):
Toàn bộ kiểm thử logic cô lập (State Machine, PricingService, AuthService, v.v.):
```bash
cd backend
npm test
```

### 2. Kiểm thử Tự động E2E Concurrency & Idempotency (Task 10):
Bộ kiểm thử tích hợp tự động với database PostgreSQL thật, kiểm tra toàn diện:
- **(c)** Tranh chấp kho: 10 request đặt hàng song song với sản phẩm tồn kho = 3 (Optimistic Locking, đảm bảo 201 <= 3, tồn kho cuối >= 0, không có 500).
- **(c2)** Tranh chấp kho topping: 10 request đặt song song với topping tồn kho = 2.
- **(b)** Tranh chấp Idempotency-Key: 5 request thanh toán song song cùng 1 key (chỉ 1 Payment được lưu, cùng payment ID, điểm tích lũy chỉ cộng 1 lần, không có 500).
- **(b2)** Sai lệch request body: cùng key nhưng đổi phương thức thanh toán trả về `409 Conflict`.
- **(a)** State machine error paths: hủy đơn đã `PAID` trả về `409 Conflict`; hủy 2 lần trả về `409 Conflict`.

```bash
cd backend
npm run test:e2e
```
*(Yêu cầu database PostgreSQL đang chạy và đã migrate. Bộ test tự tạo dữ liệu độc lập và dọn dẹp sạch sau khi chạy, có thể chạy lặp lại nhiều lần mà không phụ thuộc trạng thái DB)*.

### 3. Script Demo Tranh Chấp Thủ Công (Console Demo):
Script chạy trực quan ra màn hình terminal để phục vụ trình chiếu/demo cho hội đồng chấm:
```bash
cd backend
npm run test:concurrency
```

### 4. Kiểm thử Type & Build Frontend:
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📌 GHI CHÚ VỀ PHẠM VI HỆ THỐNG (SCOPE & MVP)

- **Quy trình Barista (Trạng thái PREPARING / READY / COMPLETED):**
  Theo yêu cầu đề bài đồ án, đồ án tập trung vào trải nghiệm khách hàng đặt hàng và thanh toán không tiền mặt. Các trạng thái chế biến đồ uống của Barista (`PREPARING`, `READY`, `COMPLETED`) nằm ngoài phạm vi giao diện MVP của đợt này. Toàn bộ logic chuyển trạng thái hợp lệ và bất hợp lệ của quy trình này đã được bảo đảm và kiểm thử đầy đủ bằng unit test state machine (`backend/src/modules/orders/order-state.spec.ts`).

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
│   ├── test/                     # Test Suites (e2e, concurrency script)
│   │   ├── jest-e2e.json         # Cấu hình Jest E2E
│   │   ├── orders-concurrency.e2e-spec.ts  # Test tự động Concurrency & Idempotency
│   │   └── concurrency.ts        # Script demo terminal
│   ├── Dockerfile                # Multi-stage Docker build cho Backend
│   └── requests/smoke-gd1.http   # File request HTTP kiểm thử nhanh REST Client
├── frontend/                     # Ứng dụng Next.js 15 App Router (Port 3000)
│   ├── src/
│   │   ├── app/                  # Route pages: /, /menu, /cart, /checkout, /orders, /auth
│   │   ├── components/           # UI components, layout, MockGatewayModal
│   │   ├── hooks/                # useRequireAuth, useHydrated
│   │   ├── lib/                  # api-client, format-currency, idempotency
│   │   ├── services/             # auth, product, order, payment services
│   │   └── store/                # useAuthStore, useCartStore (Zustand)
│   ├── Dockerfile                # Multi-stage Docker build cho Frontend
│   └── design/design-system.md   # Đặc tả Design System "Warm Roasted Modern"
├── docs/                         # Tài liệu đặc tả & Hợp đồng API
│   ├── auth/                     # Use-case & Contract Auth
│   ├── cart/                     # Use-case & Contract Giỏ hàng
│   ├── order/                    # Đặc tả Đặt hàng & Concurrency Control
│   ├── payment/                  # Idempotency & Cổng thanh toán
│   ├── order-history/            # Lịch sử đơn hàng & Tra cứu chi tiết
│   ├── git-convention.md         # Quy chuẩn Git & Commit
│   └── checklist-review.md       # Tiêu chí review code
├── docker-compose.yml            # Khởi chạy PostgreSQL, Backend, Frontend & Seed
└── README.md
```
