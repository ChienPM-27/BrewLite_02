# BrewLite Frontend (Next.js 15 App Router)

Giao diện người dùng cho hệ thống đặt cà phê BrewLite, xây dựng trên **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS 3**, và **Zustand**.

## 🎨 Thiết kế
- Tuân thủ Design System **Warm Roasted Modern** (`frontend/design/design-system.md`).
- Bảng màu: Nâu cà phê rang mộc (`#6F4E37`, `#4A2E1B`), kem sữa (`#FAF7F2`, `#FFFDF9`), bạc hà thực vật (`#10D98A`, `#065F46`), hổ phách (`#D97706`).
- Nút bấm bo tròn pill, đổ bóng elevation ấm, segmented selector, trạng thái chip badge đồng bộ.

## 🚀 Cài đặt & Khởi chạy

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng khởi chạy tại: `http://localhost:3000`

## ⚙️ Cấu hình biến môi trường (.env.local)

Sao chép `.env.example` thành `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_DEMO_MODE=true
```
- `NEXT_PUBLIC_API_URL`: Địa chỉ Backend API (NestJS).
- `NEXT_PUBLIC_DEMO_MODE`: Bật tính năng giả lập lỗi cổng thanh toán (`X-Mock-Outcome: FAILED`) trên trang thanh toán.

## 📦 Các luồng nghiệp vụ đã tích hợp
1. **Thực đơn & Chi tiết món (`/menu`, `/products/:id`):**
   - Danh sách món lấy trực tiếp từ `GET /api/v1/products`.
   - Chọn size (S/M/L) và topping (tối đa 3 topping) với tính giá tự động.
2. **Giỏ hàng (`/cart`):**
   - Lưu trữ qua Zustand persist vào `localStorage`.
   - Chỉnh sửa size / topping món đã thêm bằng modal.
   - Nhập mã ưu đãi khuyến mãi.
3. **Xác thực (`/auth/login`, `/auth/register`):**
   - Đăng nhập, đăng ký tài khoản thành viên.
   - Nút điền nhanh tài khoản demo (`demo@brewlite.test` / `Demo@12345`).
   - Điều hướng thông minh theo query parameter `?next=...`.
4. **Đặt hàng & Thanh toán (`/checkout`, `/checkout/payment`):**
   - Tạo đơn hàng `POST /api/v1/orders`.
   - Cơ chế phát hiện thay đổi giỏ hàng qua chữ ký `computeCartSignature`, tránh trùng lặp đơn PENDING.
   - Thanh toán `POST /api/v1/payments` với `Idempotency-Key` chuẩn UUID.
   - Hỗ trợ thử lại với key mới hoặc hủy đơn khi thanh toán thất bại.
5. **Lịch sử & Chi tiết đơn (`/orders`, `/orders/:id`):**
   - Xem danh sách đơn kèm bộ lọc trạng thái và phân trang.
   - Chi tiết từng món, topping, tổng tiền, điểm tích lũy `pointsEarned`, và lịch sử các lần giao dịch.
