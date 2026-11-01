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
- Đơn hàng đang ở trạng thái cho phép thanh toán: `PENDING` hoặc `PAYMENT_FAILED`.
- Backend và cơ sở dữ liệu hoạt động bình thường.

## 3. Luồng chính (Main Flow)

1. Khách hàng chọn đơn hàng cần thanh toán.
2. Hệ thống hiển thị số tiền cần thanh toán.
3. Khách hàng chọn ví điện tử hoặc thẻ ngân hàng.
4. Frontend gửi yêu cầu `POST /api/v1/payments` kèm `orderId`, `method` và `Idempotency-Key`.
5. Backend xác thực dữ liệu, quyền truy cập và trạng thái đơn hàng.
6. Backend kiểm tra `Idempotency-Key`:
   - Nếu key đã tồn tại và payload giống nhau, trả kết quả đã lưu mà không xử lý thanh toán lại.
   - Nếu key đã tồn tại nhưng payload khác nhau, trả `409 Conflict`.
   - Nếu key chưa tồn tại, tiếp tục xử lý.
7. Backend xác định số tiền thanh toán từ `Order.finalAmount` trong database.
8. Backend xử lý lần thử thanh toán và lưu bản ghi Payment với trạng thái phù hợp theo quy trình xử lý giao dịch.
9. Backend gửi yêu cầu đến Mock Payment Gateway.
10. Nếu gateway xác nhận thành công:
    - Payment chuyển sang `SUCCESS` và lưu `transactionRef`.
    - Order chuyển sang `PAID` thông qua `OrderService.transition()`.
    - Hệ thống ghi nhận lịch sử trạng thái và xử lý loyalty theo thiết kế.
11. Backend trả kết quả theo response contract của API. Frontend chỉ làm rỗng giỏ hàng và xóa `pendingOrderId` sau khi xác nhận thanh toán thành công.

**Quy tắc tồn kho:** Luồng Payment không trực tiếp trừ hoặc hoàn `Ingredient.stock`. Tồn kho nguyên liệu phải được bảo toàn trong các luồng thanh toán thất bại, retry và replay, trừ khi có một nghiệp vụ độc lập khác được thiết kế rõ ràng để thay đổi tồn kho.

## 4. Luồng thay thế (Alternative Flows)

### A1 – Thanh toán thất bại

1. Mock Payment Gateway trả về kết quả thất bại đã được xác nhận.
2. Backend cập nhật Payment thành `FAILED` và lưu `failureReason`.
3. Backend chuyển Order từ `PENDING` sang `PAYMENT_FAILED` thông qua `OrderService.transition()`.
4. Frontend hiển thị thông báo thất bại và giữ nguyên giỏ hàng.
5. Khách hàng có thể thử lại theo quy tắc retry:
   - Order chuyển từ `PAYMENT_FAILED` sang `PENDING` thông qua `OrderService.transition()`.
   - Request thanh toán mới sử dụng `Idempotency-Key` mới.
   - Hệ thống tạo bản ghi Payment mới cho lần thử tiếp theo.
6. `Ingredient.stock` không thay đổi do riêng luồng Payment.

### A2 – Idempotency-Key đã tồn tại

- **Cùng key, cùng payload:** Backend trả kết quả Payment đã lưu, không tạo Payment trùng, không gọi lại Mock Gateway và không xử lý loyalty lần nữa.
- **Cùng key, payload khác:** Backend trả `409 Conflict`; không thực hiện lại thanh toán.
- **Request đồng thời dùng cùng key:** Cơ chế unique constraint và xử lý xung đột phải bảo đảm không tạo Payment trùng. Request cạnh tranh cần truy vấn lại key để trả kết quả đã lưu nếu giao dịch trước đã hoàn tất.
- `Ingredient.stock` không thay đổi do việc replay hoặc xử lý xung đột idempotency.

HTTP status khi replay phải thống nhất với API contract và code thực tế; không mặc định `201 Created` nếu endpoint chưa được xác minh có hành vi đó.

### A3 – Timeout từ cổng thanh toán

1. Khi gateway timeout, Backend xử lý theo chính sách timeout đã được thống nhất.
2. Nếu timeout được xác định là thất bại theo thiết kế MVP, Backend cập nhật Payment thành `FAILED`, ghi `failureReason = "Gateway timeout"` và chuyển Order sang `PAYMENT_FAILED` thông qua `OrderService.transition()`.
3. Khách hàng có thể thử lại với key mới sau khi Order đủ điều kiện thanh toán.
4. `Ingredient.stock` không thay đổi do riêng luồng Payment.

**Lưu ý:** Timeout không phải lúc nào cũng chứng minh giao dịch phía gateway đã thất bại. Trường hợp kết quả chưa xác định cần được xử lý theo chính sách đã thống nhất; không tự động xem mọi timeout là thất bại đã được xác nhận nếu code chưa bảo đảm điều đó.

## 5. Hậu điều kiện (Postconditions)

### Thành công

- Payment có trạng thái `SUCCESS`.
- Order chuyển sang `PAID`.
- `Order.paidAt` được ghi nhận theo logic của `OrderService.transition()`.
- Loyalty được xử lý theo thiết kế và không được cộng lặp khi replay.
- Frontend làm rỗng giỏ hàng bằng `clearCart()` và xóa `pendingOrderId` sau khi xác nhận thành công.
- Luồng Payment không trực tiếp thay đổi `Ingredient.stock`.

### Thất bại

- Payment có trạng thái `FAILED`.
- Order chuyển sang `PAYMENT_FAILED`.
- Frontend giữ nguyên giỏ hàng để khách hàng có thể thử lại.
- `Ingredient.stock` giữ nguyên so với trước request nếu không có nghiệp vụ độc lập khác tác động đến tồn kho.

### Replay

- Trả kết quả Payment đã lưu theo quy tắc idempotency.
- Không tạo Payment mới hoặc xử lý lại giao dịch.
- Không cộng loyalty lần nữa.
- `Ingredient.stock` không thay đổi do replay.

## 6. Acceptance Criteria

- Khách hàng có thể chọn `E_WALLET` hoặc `BANK_CARD`.
- Backend lấy số tiền từ `Order.finalAmount`, không tin cậy số tiền do Frontend gửi.
- Thanh toán thành công cập nhật Payment thành `SUCCESS`, Order thành `PAID` và xử lý loyalty theo thiết kế.
- Thanh toán thất bại cập nhật Payment thành `FAILED`, Order thành `PAYMENT_FAILED` và giữ nguyên giỏ hàng.
- Cùng key và cùng payload không tạo giao dịch trùng hoặc xử lý thanh toán lại.
- Cùng key nhưng payload khác bị từ chối với `409 Conflict`.
- Request đồng thời dùng cùng key không tạo Payment trùng.
- Retry sử dụng key mới và tuân thủ state machine của Order.
- Replay không xử lý lại giao dịch, không cộng loyalty lần nữa và không thay đổi `Ingredient.stock`.
- Thanh toán thất bại và retry không trực tiếp thay đổi `Ingredient.stock`.
- Tồn kho được xác định bằng `Ingredient.stock`, không dùng `Product.stock` hoặc `Topping.stock` đã deprecated.
- Kiểm thử tồn kho cần so sánh dữ liệu trước và sau request trên database; unit test mock không phải bằng chứng duy nhất cho tồn kho thực tế.

## 7. Quy tắc nghiệp vụ (Business Rules)

| Mã quy tắc | Tên quy tắc | Nội dung chi tiết |
|---|---|---|
| **BR-PAY-01** | Idempotency | Header `Idempotency-Key` là bắt buộc. Cùng key và cùng payload trả kết quả đã lưu mà không tạo Payment mới hoặc gọi lại gateway. Cùng key nhưng payload khác trả `409 Conflict`. Request đồng thời phải được xử lý để không tạo Payment trùng. HTTP status replay tuân theo API contract thực tế. |
| **BR-PAY-02** | Số tiền thanh toán từ CSDL | Backend lấy `amount` từ `Order.finalAmount`; không sử dụng số tiền do client tự gửi để quyết định số tiền thanh toán. |
| **BR-PAY-03** | Điều kiện trạng thái đơn hàng | `POST /api/v1/payments` chỉ chấp nhận Order ở `PENDING` hoặc `PAYMENT_FAILED`. Các trạng thái không hợp lệ bị từ chối với `409 Conflict`. |
| **BR-PAY-04** | Thanh toán thành công | Khi gateway xác nhận thành công, Payment chuyển sang `SUCCESS`, lưu `transactionRef`; Order chuyển sang `PAID` qua `OrderService.transition()`; lịch sử trạng thái và loyalty được xử lý theo thiết kế. Frontend làm rỗng giỏ hàng sau khi xác nhận thành công. |
| **BR-PAY-05** | Thanh toán thất bại | Khi gateway trả kết quả thất bại đã được xác nhận, Payment chuyển sang `FAILED`, lưu `failureReason`; Order chuyển sang `PAYMENT_FAILED` qua `OrderService.transition()`. Giỏ hàng được giữ nguyên. Luồng Payment không trực tiếp thay đổi `Ingredient.stock`. |
| **BR-PAY-06** | Retry | Retry sau thất bại chuyển Order từ `PAYMENT_FAILED` sang `PENDING` qua `OrderService.transition()`, sử dụng key mới và tạo Payment mới. Không áp dụng giới hạn ba lần hoặc thời hạn 15 phút nếu các giới hạn này đã được loại bỏ khỏi thiết kế. Retry không trực tiếp thay đổi `Ingredient.stock`. |
| **BR-PAY-07** | Timeout | Cách ghi nhận Payment và chuyển trạng thái Order khi timeout phải tuân theo chính sách timeout đã thống nhất. Nếu timeout được xác định là thất bại theo thiết kế MVP, Payment chuyển sang `FAILED`, ghi `Gateway timeout` và Order chuyển sang `PAYMENT_FAILED`. Không xem kết quả chưa xác định là thất bại đã được xác nhận nếu chưa có căn cứ. |
| **BR-PAY-08** | Bảo toàn tồn kho nguyên liệu | `PaymentsService` không trực tiếp gọi `deductIngredients()` hoặc `restoreIngredients()` để xử lý kết quả thanh toán. `Ingredient.stock` phải giữ nguyên do riêng luồng Payment khi thất bại, retry hoặc replay. Tồn kho thực tế được xác minh bằng dữ liệu database trước và sau kiểm thử. |
| **BR-PAY-09** | Replay không lặp nghiệp vụ | Replay không gọi lại gateway, không tạo Payment mới, không cộng loyalty lần nữa và không làm thay đổi `Ingredient.stock`. |

## 8. Kết luận các vấn đề thiết kế

### Q1 – Khi nào chuyển Order sang `PAYMENT_FAILED`?

**Đã chốt – Quyết định D1**

- Khi giao dịch thất bại đã được xác nhận, Payment chuyển sang `FAILED` và Order chuyển sang `PAYMENT_FAILED` qua `OrderService.transition()`.
- Khách hàng được phép retry không giới hạn theo quy tắc nghiệp vụ; retry chuyển Order về `PENDING` và sử dụng key mới.
- Không áp dụng giới hạn ba lần, thời hạn 15 phút hoặc khóa vĩnh viễn Order ở `PAYMENT_FAILED`.

### Q2 – Thời gian chờ thanh toán tối đa

**Đã chốt – Quyết định D6**

- Loại bỏ scheduler/cron-job tự động hết hạn 15 phút và trường `expiresAt` khỏi phạm vi MVP.
- Đơn hàng bị bỏ dở có thể tiếp tục giữ tồn kho theo cơ chế giữ tồn kho của hệ thống cho đến khi được hủy qua `POST /orders/:id/cancel`.
- Việc giữ tồn kho do cơ chế đơn hàng không đồng nghĩa với việc luồng Payment được phép trực tiếp trừ hoặc hoàn `Ingredient.stock`.

## 9. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo đặc tả Use Case Payment.
- v1.1 (2026-10-16): Áp dụng các quyết định D1, D2 và D6.
- v1.2 (2026-10-29): Làm rõ idempotency, retry, replay và yêu cầu bảo toàn `Ingredient.stock` trong phạm vi Payment.