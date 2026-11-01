# ☕ BrewLite – Hệ Thống Đặt Cà Phê & Thanh Toán Không Tiền Mặt

> **Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – Năm học 2026–2027  
> **Kiến trúc Monorepo:** 
> - **Backend:** NestJS 11 + Prisma ORM 6 + PostgreSQL 16 (Docker)
> - **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS 3 + Zustand
> - **Thiết kế:** Design System **Warm Roasted Modern** (tông nâu cà phê ấm, kem sữa, bạc hà)

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG (QUICK START)

Bạn có thể chạy dự án nhanh nhất qua **Docker** (khuyên dùng) hoặc **Chạy trực tiếp trên máy** để lập trình.

---

### CÁCH 1: Siêu đơn giản với Docker (Khuyên Dùng – 1 Lệnh)

Yêu cầu máy đã cài **Docker Desktop** (đang bật).

#### 1. Tạo file cấu hình môi trường:
```bash
cp .env.example .env
```
*(Nếu dùng Windows PowerShell: `copy .env.example .env`)*

#### 2. Khởi động toàn bộ hệ thống (Postgres, Backend, Frontend, Cloudflare Tunnel):
```bash
docker compose up --build -d
```
*(Lưu ý: Dùng cờ `--build` để đảm bảo Docker luôn biên dịch phiên bản code mới nhất của Frontend và Backend)*.

#### 3. Nạp dữ liệu mẫu ban đầu (Sản phẩm, Topping, Voucher, Tài khoản):
```bash
docker compose --profile seed run --rm seed
```

#### 4. Truy cập ứng dụng:
- 🌐 **Khách hàng (Đặt hàng & Thanh toán):** [http://localhost:3000](http://localhost:3000)
- 👨‍🍳 **Quản lý / Barista (Nhận đơn & Pha chế):** [http://localhost:3000/admin](http://localhost:3000/admin)
- 🔌 **Backend REST API:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1) *(Health check: `http://localhost:4000/api/v1/health`)*

#### Dừng hệ thống khi không dùng:
```bash
docker compose down
# Hoặc nếu muốn xóa sạch cả database để làm lại từ đầu:
docker compose down -v
```

---

### CÁCH 2: Chạy trực tiếp cho Lập trình viên (Local Dev)

Dành cho lúc viết code, cần hot-reload nhanh mà không muốn rebuild Docker container.

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
API hoạt động tại: `http://localhost:4000/api/v1`

#### 3. Cài đặt và chạy Frontend (Port 3000):
Mở một cửa sổ Terminal mới:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Giao diện hoạt động tại: `http://localhost:3000`

---

## 🔑 TÀI KHOẢN & DỮ LIỆU DEMO

Hệ thống đã nạp sẵn dữ liệu mẫu phục vụ kiểm thử:

### 1. Tài khoản đăng nhập sẵn
| Vai trò | Email | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Khách hàng** | `demo@brewlite.test` | `Demo@12345` | Đặt món, áp mã giảm giá, thanh toán, tích 120 BrewPoints |
| **Admin / Barista** | `admin@brewlite.com` | `Admin@123456` | Bảng điều khiển Barista `/admin`: Chờ pha ➔ Đang pha ➔ Chờ giao ➔ Đã giao |

*(Tại màn hình Đăng nhập `http://localhost:3000/auth/login` có sẵn nút **"Điền tài khoản Demo"** để đăng nhập ngay mà không cần gõ phím).*

### 2. Mã giảm giá (Voucher)
- `WELCOME10`: Giảm 10% (tối đa **20.000đ**), áp dụng cho đơn từ **40.000đ**.
- `GIAM15K`: Giảm trực tiếp **15.000đ**, áp dụng cho đơn từ **60.000đ**.

---

## 💳 HƯỚNG DẪN KIỂM THỬ THANH TOÁN

Hệ thống hỗ trợ 2 cơ chế thanh toán:

### Lựa chọn A: Mock Payment Gateway (Mặc định – Không cần Internet/Tunnel)
Hệ thống tích hợp sẵn giao diện giả lập Cổng thanh toán trực quan dành cho báo cáo và chấm điểm:
1. Khi đến bước thanh toán đơn hàng, chọn **Cổng Mock (Thử nghiệm)** và chọn **Ví điện tử (MoMo / VietQR)** hoặc **Thẻ ngân hàng**.
2. Nhấn nút mở cổng thanh toán giả lập.
3. Sử dụng các nút mô phỏng trên giao diện:
   - **Mô phỏng: Quét mã thành công / Xác thực OTP**: Đơn chuyển sang `PAID`, cộng điểm tích lũy ngay lập tức.
   - **Mô phỏng: Thất bại / Hủy**: Đơn chuyển sang `PAYMENT_FAILED`. Khách hàng có thể bấm **"Thử lại thanh toán"** hoặc **"Hủy đơn"** (tồn kho nguyên liệu được hoàn lại tức thì).

### Lựa chọn B: Kiểm thử Cổng VNPay Sandbox thật
Dành cho kiểm thử giao dịch thật qua cổng Sandbox của VNPay:

1. **Cấu hình thông tin Merchant VNPay:**  
   Mở file `.env` (ở thư mục gốc) và điền:
   ```env
   VNPAY_TMN_CODE=JVDDQS32
   VNPAY_HASH_SECRET=IEKIESWSBCDHHJICGKDSRFDBMPKNYJXI
   ```
   Khởi động lại backend hoặc chạy `docker compose up --build -d`.

2. **Lấy Public URL từ Cloudflare Tunnel:**
   Dự án đã tích hợp sẵn container `tunnel` (Cloudflare Quick Tunnel) tự động mở cổng public ra Internet mà không cần cài phần mềm ngoài hay tạo tài khoản:
   ```bash
   docker compose logs tunnel
   ```
   Tìm dòng có dạng:
   ```text
   https://<ngau-nhien>.trycloudflare.com
   ```

3. **Cập nhật IPN URL trên trang quản trị VNPay Sandbox:**
   - Truy cập: [https://sandbox.vnpayment.vn/merchantv2/](https://sandbox.vnpayment.vn/merchantv2/)
   - Đăng nhập tài khoản Merchant Sandbox.
   - Vào menu **Cấu hình** ➔ **Cập nhật IPN URL**.
   - Dán URL đầy đủ dạng:
     ```text
     https://<ngau-nhien>.trycloudflare.com/api/v1/payments/vnpay/ipn
     ```
     *(⚠️ Lưu ý: Tuyệt đối không để dấu `#` ở đầu và bắt buộc phải có đuôi `/api/v1/payments/vnpay/ipn`)*.
   - *Lưu ý về Cloudflare Quick Tunnel:* Domain `*.trycloudflare.com` là miễn phí và ngẫu nhiên. Mỗi lần bạn restart lại container `tunnel`, hãy xem log để cập nhật lại IPN URL nếu domain thay đổi.

4. **Thanh toán trên giao diện:**
   - Tại trang thanh toán (`/checkout/payment`), chọn **Cổng VNPay** ➔ Bấm **Xác nhận thanh toán**.
   - Hệ thống sẽ chuyển hướng sang trang thanh toán của VNPay Sandbox (`https://sandbox.vnpayment.vn/...`).
   - Nhập thông tin thẻ ATM test của VNPay:
     - **Ngân hàng:** `NCB`
     - **Số thẻ:** `9704198526191432198`
     - **Tên chủ thẻ:** `NGUYEN VAN A`
     - **Ngày phát hành:** `07/15`
     - **Mã OTP xác thực:** `123456`
   - Sau khi thanh toán xong, VNPay tự động chuyển hướng về lại trang xác nhận thanh toán của BrewLite và VNPay Server bắn thông báo IPN ngầm qua Cloudflare Tunnel để cập nhật đơn hàng thành `PAID`.

---

## ☕ LUỒNG ĐẶT HÀNG & PHA CHẾ ĐẦY ĐỦ (END-TO-END)

1. **Khách đặt hàng:**
   - Đăng nhập `demo@brewlite.test` ➔ Chọn món tại `/menu` (chọn size, topping) ➔ Thêm vào giỏ.
   - Mở `/cart`, nhập mã `WELCOME10` ➔ Bấm "Tiến hành đặt hàng".
   - Bấm "Xác nhận đặt hàng" để tạo đơn `PENDING`.
2. **Thanh toán:**
   - Chọn VNPay hoặc Mock Gateway ➔ Hoàn tất thanh toán.
   - Đơn hàng chuyển sang `PAID` và tích lũy điểm thưởng thành viên (10.000đ = 1 điểm).
3. **Barista xử lý đơn (`/admin`):**
   - Đăng nhập tài khoản `admin@brewlite.com`.
   - Vào [http://localhost:3000/admin](http://localhost:3000/admin).
   - Tab **Chờ pha (PAID):** Thấy đơn mới ➔ Bấm **"Bắt đầu pha"** (chuyển sang `PREPARING`).
   - Tab **Đang pha (PREPARING):** Hoàn thành pha chế ➔ Bấm **"Pha xong"** (chuyển sang `READY`).
   - Tab **Chờ giao (READY):** Khách đến lấy ➔ Bấm **"Đã giao khách"** (chuyển sang `COMPLETED`).
4. **Khách hàng theo dõi đơn:**
   - Vào `/orders` hoặc `/orders/:id`, trạng thái đơn cập nhật theo thời gian thực tương ứng với từng bước của Barista.

---

## 🧪 CHẠY KIỂM THỬ TỰ ĐỘNG (TESTING)

### 1. Unit Test Backend (146 tests)
Kiểm tra cô lập toàn bộ nghiệp vụ (Auth, Pricing, State Machine, Idempotency, VNPay):
```bash
cd backend
npm test
```

### 2. Kiểm thử Tự động E2E Concurrency & Idempotency
Kiểm tra tranh chấp tài nguyên trên PostgreSQL thật (Optimistic Locking, Idempotency-Key song song, Rollback tồn kho):
```bash
cd backend
npm run test:e2e
```

### 3. Demo Trực quan Tranh chấp Kho trên Terminal (Console Demo)
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

## 📁 CẤU TRÚC MONOREPO

```
BrewLite/
├── backend/                      # Ứng dụng NestJS REST API (Port 4000)
│   ├── src/
│   │   ├── common/               # Interceptors, Filters, Guards, Decorators
│   │   ├── modules/
│   │   │   ├── auth/             # Xác thực người dùng, JWT, Admin Guard
│   │   │   ├── products/         # Danh mục sản phẩm & Topping
│   │   │   ├── orders/           # Đặt hàng, State Machine, Rollback tồn kho
│   │   │   └── payments/         # Thanh toán Idempotency, Mock Gateway & VNPay IPN
│   │   └── prisma/               # Prisma Service & Seed data
│   ├── prisma/schema.prisma      # Mô hình cơ sở dữ liệu PostgreSQL
│   ├── test/                     # Test Suites (E2E Concurrency, Jest config)
│   └── Dockerfile                # Multi-stage Docker build cho Backend
├── frontend/                     # Ứng dụng Next.js 15 App Router (Port 3000)
│   ├── src/
│   │   ├── app/                  # Các trang: /, /menu, /cart, /checkout, /orders, /admin, /payment
│   │   ├── components/           # UI components, Header, BottomNav, MockGatewayModal
│   │   ├── hooks/                # useRequireAuth, useHydrated
│   │   ├── lib/                  # api-client, format-currency, idempotency
│   │   ├── services/             # auth, product, order, payment, admin-order services
│   │   └── store/                # useAuthStore, useCartStore (Zustand)
│   └── Dockerfile                # Multi-stage Docker build cho Frontend
├── docs/                         # Tài liệu thiết kế & Đặc tả nghiệp vụ
├── docker-compose.yml            # Docker Compose (Postgres, Backend, Frontend, Tunnel, Seed)
└── README.md                     # Hướng dẫn dự án
```
