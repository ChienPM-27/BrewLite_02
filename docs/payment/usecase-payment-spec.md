# Use Case Specification – Payment

## 1. Thông tin chung

- **Use Case ID:** UC-PAY-01
- **Tên Use Case:** Thanh toán đơn hàng
- **Actor chính:** Khách hàng
- **Actor phụ:** Cổng thanh toán giả lập (Mock Payment Gateway)
- **Mục tiêu:** Cho phép khách hàng thanh toán đơn hàng bằng ví điện tử hoặc thẻ ngân hàng và nhận kết quả giao dịch.

## 2. Tiền điều kiện (Preconditions)

- Khách hàng đã đăng nhập.
- Đơn hàng tồn tại và thuộc quyền truy cập của khách hàng.
- Đơn hàng chưa được thanh toán và đủ điều kiện thanh toán.
- Backend và cơ sở dữ liệu hoạt động bình thường.

## 3. Luồng chính (Main Flow)

1. Khách hàng chọn đơn hàng cần thanh toán.
2. Hệ thống hiển thị số tiền cần thanh toán.
3. Khách hàng chọn ví điện tử hoặc thẻ ngân hàng.
4. Frontend gửi yêu cầu `POST /api/v1/payments` kèm `orderId`, `method` và `Idempotency-Key`.
5. Backend xác thực dữ liệu, quyền truy cập và trạng thái đơn hàng.
6. Backend kiểm tra `Idempotency-Key`.
7. Backend xác định số tiền thanh toán từ dữ liệu đơn hàng trong database.
8. Backend tạo bản ghi Payment với trạng thái `PENDING`.
9. Backend gửi yêu cầu đến Mock Payment Gateway.
10. Nếu thanh toán thành công, Backend cập nhật Payment thành `SUCCESS` và cập nhật đơn hàng thành `PAID`.
11. Hệ thống trả kết quả đã được bọc qua `TransformInterceptor` (`{ success: true, statusCode: 201, data: {...}, timestamp }`) để Frontend hiển thị cho khách hàng.

## 4. Luồng thay thế (Alternative Flows)

### A1 – Thanh toán thất bại

1. Cổng thanh toán giả lập trả kết quả thất bại.
2. Backend cập nhật Payment thành `FAILED`.
3. Backend lưu lý do thất bại nếu có.
4. Frontend hiển thị thông báo thất bại.
5. Khách hàng có thể thử lại nếu đơn hàng vẫn đủ điều kiện, sử dụng `Idempotency-Key` mới.

### A2 – Idempotency-Key đã tồn tại

- Nếu key và nội dung yêu cầu giống nhau, Backend trả lại kết quả đã lưu hoặc trạng thái hiện tại của giao dịch.
- Nếu key giống nhưng nội dung yêu cầu khác, Backend từ chối yêu cầu.
- Không tạo giao dịch thanh toán trùng.

### A3 – Timeout hoặc chưa xác định kết quả

1. Backend giữ Payment ở trạng thái `PENDING` khi chưa xác định được kết quả cuối cùng.
2. Hệ thống thực hiện kiểm tra hoặc đối soát trạng thái giao dịch.
3. Không tự động tạo giao dịch mới khi kết quả lần trước chưa rõ.

## 5. Hậu điều kiện (Postconditions)

- Thành công: Payment có trạng thái `SUCCESS`; Order có trạng thái `PAID`.
- Thất bại đã xác nhận: Payment có trạng thái `FAILED`; đơn hàng không bị đánh dấu đã thanh toán.
- Chưa rõ kết quả: Payment giữ trạng thái `PENDING` cho đến khi được xác minh.

## 6. Acceptance Criteria

- Khách hàng có thể chọn một trong hai phương thức: `E_WALLET` hoặc `BANK_CARD`.
- Backend tự xác định số tiền từ đơn hàng, không tin số tiền do Frontend tự gửi.
- Thanh toán thành công cập nhật trạng thái đơn hàng thành `PAID`.
- Thanh toán thất bại không đánh dấu đơn hàng là đã thanh toán.
- Cùng Idempotency-Key và cùng nội dung yêu cầu không tạo giao dịch trùng.
- Cùng Idempotency-Key nhưng nội dung khác phải bị từ chối.
- Timeout chưa rõ kết quả không được tự động xem là thất bại hoặc tự động tạo giao dịch mới.
