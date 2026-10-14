# Test Cases – Payment

## 1. Phạm vi

Kiểm thử API `POST /api/v1/payments`, hai phương thức `E_WALLET`, `BANK_CARD`, xử lý kết quả từ Mock Payment Gateway và quy tắc Idempotency-Key.

## 2. Test Cases

| ID | Trường hợp kiểm thử | Kết quả mong đợi |
|---|---|---|
| TC-PAY-01 | Thanh toán bằng ví điện tử thành công | Payment `SUCCESS`, Order `PAID` |
| TC-PAY-02 | Thanh toán bằng thẻ ngân hàng thành công | Payment `SUCCESS`, Order `PAID` |
| TC-PAY-03 | Gateway trả thất bại | Payment `FAILED`, không đánh dấu Order đã thanh toán |
| TC-PAY-04 | Thiếu `orderId` | Từ chối request |
| TC-PAY-05 | Thiếu `method` | Từ chối request |
| TC-PAY-06 | `method` không hợp lệ | Từ chối request |
| TC-PAY-07 | Order không tồn tại | Trả lỗi phù hợp, không gọi gateway |
| TC-PAY-08 | Người dùng không có quyền thanh toán Order | Từ chối request |
| TC-PAY-09 | Order đã thanh toán | Không tạo giao dịch thanh toán mới trái quy tắc |
| TC-PAY-10 | Cùng key, cùng nội dung | Trả kết quả cũ hoặc trạng thái hiện tại, không tạo giao dịch trùng |
| TC-PAY-11 | Cùng key, nội dung khác | Từ chối request |
| TC-PAY-12 | Nhiều request đồng thời dùng cùng key | Chỉ tạo một giao dịch logic |
| TC-PAY-13 | Thử lại sau thất bại với key mới | Tạo lần thử mới nếu Order còn đủ điều kiện |
| TC-PAY-14 | Gateway timeout | Giữ `PENDING` và yêu cầu xác minh |
| TC-PAY-15 | Timeout, sau đó xác nhận thành công | Cập nhật `SUCCESS`, không tính tiền hai lần |
| TC-PAY-16 | Timeout, sau đó xác nhận thất bại | Cập nhật `FAILED` khi đã xác minh |
| TC-PAY-17 | Frontend gửi số tiền không đúng | Backend vẫn dùng số tiền từ Order |
| TC-PAY-18 | Lần thử trước thất bại, lần sau thành công | Lưu lịch sử các lần thử và cập nhật Order theo kết quả thành công |

## 3. Điều kiện nghiệm thu

- Các trường hợp hợp lệ và không hợp lệ được xử lý đúng.
- Trạng thái Payment và Order nhất quán.
- Idempotency hoạt động với request lặp và request đồng thời.
- Không tạo giao dịch thanh toán mới khi kết quả của lần trước chưa rõ.
- Kết quả kiểm thử thực tế phải được ghi nhận là Pass hoặc Fail sau khi Backend triển khai.
