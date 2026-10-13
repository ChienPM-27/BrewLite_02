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

---

## 7. Quy tắc nghiệp vụ (Business Rules)

| Mã quy tắc | Tên quy tắc | Nội dung chi tiết |
| :--- | :--- | :--- |
| **BR-PAY-01** | Idempotency (Cơ chế chống trùng lặp) | Header `Idempotency-Key` là bắt buộc khi gọi `POST /api/v1/payments`.<br>- **Cùng key + cùng payload:** Backend trả lại kết quả đã lưu trong bảng `Payment` (hoặc trạng thái đang xử lý) mà không tạo giao dịch mới hay gọi lại Mock Gateway.<br>- **Cùng key + khác payload:** Backend từ chối với mã lỗi `409 Conflict`. |
| **BR-PAY-02** | Số tiền thanh toán từ CSDL (Amount Verification) | Số tiền thanh toán (`amount`) bắt buộc phải lấy từ trường `Order.finalAmount` trong database. Backend tuyệt đối không tin cậy và không sử dụng bất kỳ số tiền nào do Client tự gửi lên. |
| **BR-PAY-03** | Điều kiện trạng thái đơn hàng (Order State Precondition) | Chỉ chấp nhận thanh toán cho các đơn hàng đang ở trạng thái `PENDING`. Nếu đơn hàng đã ở trạng thái `PAID`, `CANCELLED`, `PAYMENT_FAILED` hoặc khác `PENDING`, Backend từ chối giao dịch với mã lỗi phù hợp (`400 Bad Request` hoặc `409 Conflict`). |
| **BR-PAY-04** | Xử lý thanh toán thành công (Payment Success) | Khi Mock Gateway xác nhận thành công:<br>1. Cập nhật `Payment.status = SUCCESS`, lưu `transactionRef`.<br>2. Cập nhật `Order.status = PAID`, gán `Order.paidAt = now()`.<br>3. Ghi nhận lịch sử trạng thái vào `OrderStatusHistory` và tích lũy điểm thưởng loyalty (`Order.pointsEarned`). |
| **BR-PAY-05** | Xử lý thanh toán thất bại (Payment Failure) | Khi Mock Gateway trả về kết quả thất bại (từ chối thẻ, không đủ số dư...):<br>1. Cập nhật bản ghi `Payment.status = FAILED`, lưu `failureReason`.<br>2. `Order.status` vẫn **giữ nguyên PENDING** (khi chưa vượt quá số lần retry tối đa) để khách hàng có thể đổi phương thức hoặc thử lại. |
| **BR-PAY-06** | Quy tắc thử lại thanh toán (Retry Policy) | Khi khách hàng thử lại sau một giao dịch thất bại (`FAILED`), Frontend **bắt buộc phải sinh một `Idempotency-Key` mới**. Cấm tái sử dụng key cũ của lần giao dịch đã thất bại. Mỗi lần thử lại sẽ tạo một bản ghi `Payment` mới liên kết với cùng `orderId`. |
| **BR-PAY-07** | Xử lý Timeout và trạng thái chưa rõ (Timeout Handling) | Khi yêu cầu sang Gateway bị timeout hoặc chưa nhận được kết quả cuối cùng:<br>1. `Payment.status` được giữ ở mức `PENDING`.<br>2. `Order.status` giữ nguyên `PENDING`.<br>3. Tuyệt đối không tự động coi là thất bại và không tự động gửi giao dịch mới cho đến khi có kết quả đối soát/xác minh. |

---

## 8. Giả định / Câu hỏi mở

> Các mục dưới đây **chưa được chốt**. Mỗi mục được đánh dấu **ĐỀ XUẤT – cần nhóm xác nhận** trước khi đưa vào implementation.

### [Q1] Khi nào chuyển đơn hàng sang trạng thái `OrderStatus.PAYMENT_FAILED`?

**ĐỀ XUẤT – cần nhóm xác nhận.**

- **Hiện trạng:** Trong `schema.prisma`, enum `OrderStatus` có giá trị `PAYMENT_FAILED`. Tuy nhiên, khi một lượt thanh toán đơn lẻ thất bại, bản ghi `Payment` chuyển `FAILED` trong khi `Order` vẫn giữ `PENDING` để khách hàng có cơ hội thử lại.
- **Đề xuất quy tắc kích hoạt `OrderStatus.PAYMENT_FAILED`:**
  - Cho phép khách hàng thử lại tối đa **3 lần** (`max_retry = 3`).
  - Nếu sau 3 lần thanh toán đều thất bại (`Payment.status = FAILED`), hoặc sau thời hạn thanh toán quy định (**15 phút** kể từ thời điểm tạo đơn mà đơn hàng chưa được thanh toán thành công), Backend sẽ tự động cập nhật `Order.status` từ `PENDING` sang `PAYMENT_FAILED`.
  - Khi đơn đã ở trạng thái `PAYMENT_FAILED`, đơn hàng sẽ bị khóa thanh toán. Khách hàng không thể tiếp tục gửi yêu cầu `POST /api/v1/payments` cho đơn này nữa.
- **Quy tắc chuyển tiếp tiếp theo (Next State):** Sau khi chuyển sang `PAYMENT_FAILED`, hệ thống giải phóng số lượng tồn kho (`stock`) đã giữ cho đơn hàng, và đơn hàng có thể được chuyển sang `CANCELLED` (hoặc giữ `PAYMENT_FAILED` làm trạng thái kết thúc phục vụ báo cáo phân tích tỷ lệ rớt đơn).

### [Q2] Thời gian chờ thanh toán tối đa (Payment Timeout Window)

**ĐỀ XUẤT – cần nhóm xác nhận.**

- Đề xuất mặc định: Mỗi đơn hàng có thời hạn thanh toán tối đa là **15 phút**.
- Lý do: Tránh việc giữ chỗ tồn kho (`stock`) quá lâu làm ảnh hưởng đến khách hàng khác trong giờ cao điểm.
- Hệ quả nếu chốt: Cần bố trí một cron-job hoặc scheduler kiểm tra các đơn hàng `PENDING` quá 15 phút để chuyển trạng thái sang `PAYMENT_FAILED` / `CANCELLED` và hoàn kho.
