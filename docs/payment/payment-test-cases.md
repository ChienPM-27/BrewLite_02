# Test Cases – Payment

## 1. Phạm vi

Kiểm thử API `POST /api/v1/payments`, hai phương thức `E_WALLET` và `BANK_CARD`, kết quả từ Mock Payment Gateway, VNPay Gateway, quy tắc `Idempotency-Key`, quy trình retry/replay, VNPay URL generation, VNPay IPN và yêu cầu bảo toàn tồn kho nguyên liệu.

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
| TC-PAY-28 | Tạo VNPay payment URL thành công | Backend tạo Payment với gateway `VNPAY`, trạng thái `PENDING`; gọi VNPay Gateway với mã tham chiếu, số tiền và thông tin đơn hàng chính xác; lưu URL vào `paymentUrl`. |
| TC-PAY-29 | Tạo VNPay payment URL với số tiền lấy từ Order | Backend sử dụng `Order.finalAmount` để tạo yêu cầu VNPay; không sử dụng số tiền do Frontend tự gửi. |
| TC-PAY-30 | Tạo VNPay payment URL và kiểm tra trạng thái Order | Sau khi tạo URL thành công, Payment và Order vẫn ở `PENDING`; chưa cộng Loyalty và chưa xác nhận thanh toán thành công. |
| TC-PAY-31 | VNPay IPN có chữ ký không hợp lệ | Backend trả `RspCode: "97"`; không cập nhật Payment, Order hoặc Loyalty. |
| TC-PAY-32 | VNPay IPN thiếu dữ liệu bắt buộc | Backend trả `RspCode: "99"`; không cập nhật trạng thái giao dịch. |
| TC-PAY-33 | VNPay IPN không tìm thấy mã tham chiếu giao dịch | Backend trả `RspCode: "01"`; không cập nhật Payment hoặc Order. |
| TC-PAY-34 | VNPay IPN có số tiền không khớp Payment | Backend trả `RspCode: "04"`; không cập nhật trạng thái Payment hoặc Order. |
| TC-PAY-35 | VNPay IPN gửi lại giao dịch đã được xử lý | Backend trả `RspCode: "02"`; không cập nhật Payment lần nữa và không cộng Loyalty trùng. |
| TC-PAY-36 | VNPay IPN xác nhận giao dịch thành công | Backend xác thực chữ ký, mã tham chiếu và số tiền; Payment chuyển `SUCCESS`, Order chuyển `PAID`, Loyalty được xử lý đúng một lần; response `RspCode: "00"`. |
| TC-PAY-37 | VNPay IPN xác nhận giao dịch thất bại | Backend xác thực dữ liệu giao dịch; Payment chuyển `FAILED`, Order chuyển `PAYMENT_FAILED`, không cộng Loyalty; response `RspCode: "00"` khi kết quả thất bại đã được ghi nhận thành công. |
| TC-PAY-38 | Hai request VNPay IPN đồng thời cho cùng giao dịch | Chỉ một request cập nhật được Payment từ `PENDING`; request còn lại không xử lý giao dịch lần hai và trả `RspCode: "02"`. |
| TC-PAY-39 | VNPay IPN gửi mã giao dịch của gateway khác | Backend không tìm thấy Payment hợp lệ thuộc gateway `VNPAY`; không cập nhật giao dịch thuộc gateway khác. |
| TC-PAY-40 | VNPay IPN có `vnp_Amount` không đúng định dạng hoặc không phải số nguyên hợp lệ | Backend từ chối dữ liệu và trả mã phản hồi theo quy tắc dữ liệu không hợp lệ; không cập nhật Payment hoặc Order. |
| TC-PAY-41 | Tạo VNPay payment khi Order đã có Payment VNPay `PENDING` còn hạn | Trả lại Payment cũ cùng `paymentUrl`, không tạo Payment mới (kể cả `Idempotency-Key` khác); `Ingredient.stock` giữ nguyên. |
| TC-PAY-42 | Tạo VNPay payment khi Payment `PENDING` đã quá 15 phút | Payment cũ chuyển `FAILED` ("Hết hạn thanh toán VNPay (15 phút)"); tạo Payment mới `PENDING`; `Ingredient.stock` giữ nguyên. |
| TC-PAY-43 | VNPay IPN thành công khi Order đã `CANCELLED` | Payment `SUCCESS` với `failureReason` "Cần hoàn tiền thủ công"; Order giữ `CANCELLED`; không cộng Loyalty; `Ingredient.stock` không đổi; response `RspCode: "00"`. |
| TC-PAY-44 | VNPay IPN thành công khi Order đã `PAID` (thanh toán trùng) | Payment thứ hai `SUCCESS` kèm ghi chú hoàn tiền thủ công; Order giữ `PAID`; không cộng Loyalty lần hai; response `RspCode: "00"`. |
| TC-PAY-45 | VNPay IPN thất bại khi Order không `PENDING` | Payment `FAILED`; Order không đổi trạng thái; response `RspCode: "00"`. |
| TC-PAY-46 | Trang `/payment/vnpay-return` | Hiển thị trạng thái từ `GET /payments/:id`; poll khi `PENDING`; không tự coi là thành công dựa trên query của URL. |

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
- VNPay URL generation phải sử dụng số tiền và mã tham chiếu giao dịch đúng với dữ liệu Payment trong database.
- VNPay IPN phải xác thực chữ ký trước khi cập nhật Payment hoặc Order.
- VNPay IPN phải đối chiếu mã tham chiếu, gateway và số tiền giao dịch.
- IPN gửi lại không được xử lý giao dịch hoặc cộng Loyalty lần thứ hai.
- Response IPN phải tuân theo định dạng JSON gồm `RspCode` và `Message`.
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
9. VNPay URL generation và VNPay IPN là hai giai đoạn riêng biệt. Tạo URL thành công không đồng nghĩa giao dịch đã thanh toán thành công.
10. Kiểm thử IPN cần kiểm tra cả response JSON và side effect trên Payment, Order, Loyalty.
11. Đối với IPN đồng thời, cần kiểm tra cơ chế cập nhật có điều kiện theo trạng thái `PENDING` để ngăn xử lý trùng.
12. Các mã `RspCode` và nội dung `Message` phải được đối chiếu với implementation thực tế của `PaymentsService.handleVnpayIpn()`.

## 5. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo danh mục Test Cases Payment.
- v1.1 (2026-10-16): Áp dụng quyết định D1, D8.
- v1.2 (2026-10-26): Thống nhất quy tắc HTTP status khi replay Idempotency.
- v1.3 (2026-10-29): Bổ sung TC-PAY-20 đến TC-PAY-27 về bảo toàn tồn kho nguyên liệu trong các luồng thất bại, retry và replay.
- v1.4 (2026-10-29): Làm rõ nguyên tắc bảo toàn `Ingredient.stock`, điều kiện nghiệm thu trước/sau, xử lý timeout chưa được xác minh và phạm vi thay đổi của Payment.
- v1.5 (2026-10-31): Bổ sung TC-PAY-28 đến TC-PAY-40 về VNPay URL generation, VNPay IPN, xác thực chữ ký, kiểm tra dữ liệu giao dịch, response codes và xử lý IPN trùng.
- v1.6 (2026-11-01): Bổ sung TC-PAY-41 đến TC-PAY-46 về tái sử dụng/hết hạn Payment VNPay, IPN khi Order không `PENDING` và trang return.
