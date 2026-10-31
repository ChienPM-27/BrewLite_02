# Test Cases – Payment

## 1. Phạm vi

Kiểm thử API `POST /api/v1/payments`, hai phương thức `E_WALLET` và `BANK_CARD`, kết quả từ Mock Payment Gateway, quy tắc `Idempotency-Key`, quy trình retry/replay và yêu cầu bảo toàn tồn kho nguyên liệu.

Tồn kho nguyên liệu được xác định bằng `Ingredient.stock`. Các trường `Product.stock` và `Topping.stock` đã deprecated không được sử dụng làm căn cứ nghiệm thu yêu cầu này.

**Nguyên tắc D1:** Luồng Payment không trực tiếp trừ hoặc hoàn tồn kho nguyên liệu. Khi thanh toán thất bại, retry hoặc replay, `Ingredient.stock` phải giữ nguyên so với trước request, trừ khi có một nghiệp vụ độc lập khác được thiết kế rõ ràng để thay đổi tồn kho.

## 2. Test Cases

| ID | Trường hợp kiểm thử | Kết quả mong đợi |
|---|---|---|
| TC-PAY-01 | Thanh toán bằng ví điện tử thành công | Payment `SUCCESS`, Order chuyển `PAID`, loyalty được xử lý theo thiết kế; Frontend chỉ làm rỗng giỏ hàng sau khi xác nhận thành công. |
| TC-PAY-02 | Thanh toán bằng thẻ ngân hàng thành công | Payment `SUCCESS`, Order chuyển `PAID`, loyalty được xử lý theo thiết kế; Frontend chỉ làm rỗng giỏ hàng sau khi xác nhận thành công. |
| TC-PAY-03 | Gateway trả kết quả thất bại | Payment `FAILED`, Order chuyển `PAYMENT_FAILED`, giỏ hàng giữ nguyên; `Ingredient.stock` không thay đổi do luồng Payment. |
| TC-PAY-04 | Thiếu `orderId` | Request bị từ chối với `400 Bad Request`; không tạo Payment. |
| TC-PAY-05 | Thiếu `method` | Request bị từ chối với `400 Bad Request`; không tạo Payment. |
| TC-PAY-06 | `method` không hợp lệ | DTO validation từ chối request với `400 Bad Request`. |
| TC-PAY-07 | Order không tồn tại | Trả `404 Not Found`; không tạo Payment. |
| TC-PAY-08 | Người dùng không sở hữu Order | Trả `404 Not Found` theo hành vi hiện tại; không tạo Payment. |
| TC-PAY-09 | Order đã thanh toán hoặc có trạng thái không hợp lệ | Trả `409 Conflict` nếu Order không ở `PENDING` hoặc `PAYMENT_FAILED`; không tạo Payment mới. |
| TC-PAY-10 | Cùng key, cùng payload | Trả kết quả Payment đã lưu; không tạo Payment mới, không xử lý thanh toán lại và không thay đổi `Ingredient.stock`. |
| TC-PAY-11 | Cùng key, payload khác (`requestHash` không khớp) | Trả `409 Conflict`; không tạo Payment mới, không xử lý thanh toán lại và không thay đổi `Ingredient.stock`. |
| TC-PAY-12 | Nhiều request đồng thời sử dụng cùng key | Chỉ có một Payment được lưu cho key đó. Request cạnh tranh được xử lý theo cơ chế idempotency; không tạo giao dịch Payment trùng. |
| TC-PAY-13 | Retry sau thất bại bằng key mới | Order chuyển `PAYMENT_FAILED → PENDING`, tạo Payment mới; `Ingredient.stock` không thay đổi do luồng Payment. |
| TC-PAY-14 | Gateway timeout | Cần triển khai hoặc xác minh hành vi timeout riêng. Không mặc định timeout đồng nghĩa với thất bại đã được xác nhận; kết quả xử lý phải tuân theo thiết kế timeout đã thống nhất. |
| TC-PAY-15 | Retry sau timeout bằng key mới | Chỉ nghiệm thu sau khi hành vi timeout được thống nhất và triển khai. Retry dùng key mới; `Ingredient.stock` không thay đổi do luồng Payment. |
| TC-PAY-16 | `X-Mock-Outcome: FAILED` trong môi trường dev/test | Mock Gateway trả kết quả thất bại; Payment `FAILED`, Order `PAYMENT_FAILED`, `Ingredient.stock` không thay đổi. |
| TC-PAY-17 | Client gửi thêm trường `amount` không đúng | Backend lấy số tiền từ `Order.finalAmount`, không tin cậy số tiền do client gửi. |
| TC-PAY-18 | Lần thanh toán trước thất bại, lần sau thành công | Mỗi lần thử được lưu thành Payment riêng theo quan hệ 1-N với Order; Order chuyển `PAID` sau lần thành công; `Ingredient.stock` không thay đổi do riêng luồng Payment. |
| TC-PAY-19 | Gửi `X-Mock-Outcome: FAILED` ở production | Theo hành vi hiện tại của `MockGatewayService`, service ném `ServiceUnavailableException`; chỉ nghiệm thu sau khi xác minh hành vi thực tế và thiết kế production đã thống nhất. |
| TC-PAY-20 | So sánh tồn kho trước và sau thanh toán thất bại | Ghi lại `Ingredient.stock` của các nguyên liệu liên quan trước request. Sau khi Payment `FAILED` và Order `PAYMENT_FAILED`, các giá trị phải bằng giá trị ban đầu. |
| TC-PAY-21 | So sánh tồn kho trước và sau retry thất bại | Sau lần thất bại đầu tiên, retry bằng key mới và nhận kết quả `FAILED`; `Ingredient.stock` phải bằng giá trị trước lần retry. |
| TC-PAY-22 | So sánh tồn kho trước và sau retry thành công | Sau lần thất bại đầu tiên, retry bằng key mới và nhận kết quả `SUCCESS`; `Ingredient.stock` không thay đổi do luồng Payment. |
| TC-PAY-23 | So sánh tồn kho trước và sau replay kết quả thất bại | Gửi lại cùng key và cùng payload của Payment `FAILED`; trả kết quả đã lưu, không xử lý thanh toán lại; `Ingredient.stock` giữ nguyên. |
| TC-PAY-24 | So sánh tồn kho trước và sau replay kết quả thành công | Gửi lại cùng key và cùng payload của Payment `SUCCESS`; không tạo Payment mới, không xử lý thanh toán hoặc cộng loyalty lần nữa; `Ingredient.stock` giữ nguyên. |
| TC-PAY-25 | Cùng key nhưng payload khác | Trả `409 Conflict`; không xử lý thanh toán lại và `Ingredient.stock` giữ nguyên. |
| TC-PAY-26 | Xác nhận Payment không cập nhật tồn kho trực tiếp | Unit test xác nhận luồng Payment không gọi các phương thức cập nhật `Ingredient.stock`. Cần kiểm thử database trước/sau để xác nhận tồn kho thực tế. |
| TC-PAY-27 | Nhiều lần retry không làm thay đổi tồn kho | Thực hiện nhiều lần thất bại và retry theo state machine; `Ingredient.stock` không thay đổi do các request Payment. |

## 3. Điều kiện nghiệm thu

- Request hợp lệ và không hợp lệ được xử lý theo API contract và state machine đã thống nhất.
- Thanh toán thất bại chuyển Order sang `PAYMENT_FAILED`; retry bằng key mới tuân thủ quy trình chuyển trạng thái.
- Cùng `Idempotency-Key` và cùng payload không tạo Payment trùng hoặc xử lý thanh toán lại.
- Cùng key nhưng payload khác bị từ chối với `409 Conflict`.
- Replay không chạy lại xử lý thanh toán, không cộng loyalty lần nữa và không thay đổi tồn kho nguyên liệu.
- Nguồn tồn kho được nghiệm thu là `Ingredient.stock`, không phải `Product.stock` hoặc `Topping.stock`.
- Với các luồng thất bại, retry và replay, giá trị `Ingredient.stock` trước và sau phải bằng nhau khi không có nghiệp vụ độc lập khác tác động đến tồn kho trong khoảng kiểm thử.
- Unit test kiểm tra mock không được dùng làm bằng chứng duy nhất cho tồn kho thực tế; cần kiểm thử database trước/sau.
- Kiểm thử đồng thời phải xác nhận không tạo Payment trùng và phản hồi tuân theo API contract.
- Chỉ ghi nhận `Pass` hoặc `Fail` sau khi có kết quả kiểm thử thực tế. Test chưa chạy phải được ghi nhận là chưa xác minh.
- Các trường hợp timeout và production chỉ được nghiệm thu sau khi hành vi được thống nhất, triển khai và kiểm thử.

## 4. Ghi chú triển khai

1. `PaymentsService` không được trực tiếp gọi `deductIngredients()` hoặc `restoreIngredients()` để xử lý kết quả thanh toán.
2. Việc chuyển trạng thái Order phải thông qua `OrderService.transition()` theo thiết kế hiện tại.
3. Cần kiểm tra các service được gọi gián tiếp trong luồng Payment để bảo đảm không có cập nhật tồn kho ngoài dự kiến.
4. Unit test có thể xác nhận các phương thức cập nhật tồn kho không được gọi trực tiếp từ mock transaction. Integration test cần đọc `Ingredient.stock` trước và sau request để xác nhận dữ liệu thực tế.
5. Retry tạo một lần thử thanh toán mới và sử dụng `Idempotency-Key` mới. Replay sử dụng lại key cũ cùng payload.
6. `Payment.orderId` cho phép nhiều Payment thuộc cùng một Order để lưu các lần thử khác nhau; `idempotencyKey` phải bảo đảm tính duy nhất.
7. Không thay đổi logic của `ingredient-stock.helper.ts` hoặc `order.service.ts` trong phạm vi công việc Payment nếu không có yêu cầu phối hợp riêng.
8. Không đánh dấu test là `Pass` chỉ vì đã viết code hoặc test case.

## 5. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo danh mục Test Cases Payment.
- v1.1 (2026-10-16): Áp dụng quyết định D1, D8.
- v1.2 (2026-10-26): Thống nhất quy tắc HTTP status khi replay Idempotency.
- v1.3 (2026-10-29): Bổ sung TC-PAY-20 đến TC-PAY-27 về bảo toàn tồn kho nguyên liệu trong các luồng thất bại, retry và replay.
- v1.4 (2026-10-29): Làm rõ nguyên tắc bảo toàn `Ingredient.stock`, điều kiện nghiệm thu trước/sau, xử lý timeout chưa được xác minh và phạm vi thay đổi của Payment.
