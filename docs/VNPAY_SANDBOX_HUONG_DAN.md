# 💳 Hướng Dẫn Cấu Hình & Kiểm Thử VNPay Sandbox

Tài liệu này cung cấp đầy đủ thông tin tài khoản, thông tin thẻ test và hướng dẫn cấu hình IPN URL để phục vụ kiểm thử tích hợp Cổng thanh toán VNPay trên môi trường Sandbox.

---

## 🔑 1. Thông Tin Tài Khoản Merchant VNPay Test

- **Trang quản trị Merchant Admin:** [https://sandbox.vnpayment.vn/merchantv2/](https://sandbox.vnpayment.vn/merchantv2/)
- **Tên đăng nhập (Email):** `pminhchien2006@gmail.com`
- **Mật khẩu:** `chienCHIEN1230`
- **Mã Website (vnp_TmnCode):** `JVDDQS32`
- **Chuỗi bí mật checksum (vnp_HashSecret):** `IEKIESWSBCDHHJICGKDSRFDBMPKNYJXI`
- **URL Cổng thanh toán Sandbox:** `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`

---

## 🌐 2. Cấu Hình IPN URL (Server-to-Server Webhook)

VNPay cần gọi ngược lại hệ thống BrewLite để cập nhật trạng thái đơn hàng thành `PAID` ngay khi khách thanh toán thành công.

### Bước 1: Lấy URL Cloudflare Quick Tunnel
Dự án đã tích hợp sẵn container `tunnel` tự động sinh public URL:
- **Cách xem trên màn hình thanh toán:** Khi chọn "Cổng VNPay" tại trang `/checkout/payment`, hệ thống sẽ tự động hiển thị URL IPN hiện tại cùng nút bấm **"Sao chép IPN URL"**.
- **Cách xem trên Terminal:** Gõ lệnh:
  ```bash
  docker compose logs tunnel
  ```
  Tìm dòng có dạng: `https://<subdomain>.trycloudflare.com`

### Bước 2: Cập nhật IPN URL trên Merchant Admin
1. Đăng nhập vào [https://sandbox.vnpayment.vn/merchantv2/](https://sandbox.vnpayment.vn/merchantv2/).
2. Chọn menu **Cấu hình** ➔ **Cập nhật thông tin cấu hình** (hoặc Cài đặt thông báo).
3. Điền đường dẫn đầy đủ dạng:
   ```text
   https://<subdomain>.trycloudflare.com/api/v1/payments/vnpay/ipn
   ```
   *(⚠️ Lưu ý: Tuyệt đối không để dấu `#` ở đầu và bắt buộc phải có đuôi `/api/v1/payments/vnpay/ipn`)*.
4. Bấm **Hoàn thành / Lưu cấu hình**.

---

## 💳 3. Thông Tin Thẻ Test (Ngân Hàng NCB)

Khi giao diện VNPay Sandbox hiển thị:
1. Bấm nút **"< Quay lại"** (ở góc trên bên trái).
2. Chọn **"Thẻ nội địa và tài khoản ngân hàng"**.
3. Chọn ngân hàng **NCB** (Ngân hàng Quốc Dân) và nhập:
   - **Số thẻ:** `9704198526191432198`
   - **Tên chủ thẻ:** `NGUYEN VAN A`
   - **Ngày phát hành:** `07/15`
   - Bấm **Tiếp tục**.
4. Nhập mã OTP xác thực:
   - **OTP:** `123456`
   - Bấm **Xác nhận**.
5. Giao dịch hoàn tất thành công! VNPay sẽ tự động gọi IPN về server cập nhật đơn hàng sang `PAID` và tích điểm thưởng cho khách hàng.
