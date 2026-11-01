# Database Mapping – Payment

## 1. Mục tiêu

Mô tả mapping giữa Prisma model `Payment`, model `Order` và các cột tương ứng trong PostgreSQL; làm rõ quan hệ dữ liệu, quy tắc chuyển trạng thái, idempotency, retry, tích hợp Payment Gateway và yêu cầu bảo toàn tồn kho nguyên liệu trong phạm vi luồng Payment.

## 2. Mapping Payment

| Prisma field | Database column | Kiểu dữ liệu / Ý nghĩa |
|---|---|---|
| `id` | `id` | Khóa chính của Payment; kiểu dữ liệu thực tế theo `schema.prisma`. |
| `orderId` | `order_id` | Khóa ngoại tham chiếu `orders.id`. |
| `idempotencyKey` | `idempotency_key` | Chuỗi định danh request; phải duy nhất toàn hệ thống. |
| `requestHash` | `request_hash` | Chuỗi tùy chọn dùng đối chiếu nội dung request. |
| `amount` | `amount` | Số tiền giao dịch; độ chính xác và kiểu PostgreSQL theo schema/migration thực tế. |
| `method` | `method` | Enum `E_WALLET` hoặc `BANK_CARD`. |
| `status` | `status` | Enum `PENDING`, `SUCCESS` hoặc `FAILED`. |
| `gateway` | `gateway` | Enum `PaymentGateway`, xác định cổng thanh toán được sử dụng, gồm `MOCK` và `VNPAY` theo thiết kế hiện tại. |
| `gatewayTransactionNo` | `gateway_transaction_no` | Chuỗi tùy chọn lưu mã giao dịch do Payment Gateway cung cấp. Đối với VNPay, giá trị được lấy từ mã giao dịch trả về trong IPN (`vnp_TransactionNo`) khi cập nhật kết quả thanh toán. |
| `paymentUrl` | `payment_url` | Chuỗi tùy chọn lưu URL thanh toán do Payment Gateway tạo ra. Đối với VNPay, đây là URL để chuyển người dùng đến trang thanh toán của VNPay. |
| `failureReason` | `failure_reason` | Chuỗi tùy chọn ghi nhận nguyên nhân thất bại. |
| `transactionRef` | `transaction_ref` | Chuỗi tùy chọn lưu mã tham chiếu giao dịch do hệ thống tạo và sử dụng để đối chiếu giao dịch với Payment, đặc biệt trong quá trình nhận VNPay IPN. |
| `createdAt` | `created_at` | Thời điểm tạo Payment. |

Tên bảng: `payments`.

**Lưu ý về mapping:**

- Các tên cột như `order_id`, `idempotency_key`, `gateway_transaction_no` và `payment_url` là tên mapping dự kiến theo quy ước snake_case.
- Cần đối chiếu `schema.prisma` và migration đã áp dụng để xác nhận tên cột thực tế, đặc biệt là các trường có sử dụng `@map`.
- Kiểu dữ liệu PostgreSQL, tính nullable, default value và constraint của từng trường phải căn cứ vào schema và migration thực tế.
- Không suy diễn rằng tên field Prisma và tên column PostgreSQL luôn giống nhau.

## 3. Enum PaymentGateway

Enum `PaymentGateway` xác định cổng thanh toán được sử dụng cho mỗi bản ghi Payment.

| Giá trị | Ý nghĩa |
|---|---|
| `MOCK` | Cổng thanh toán giả lập, sử dụng để kiểm thử luồng thanh toán trong môi trường phát triển. |
| `VNPAY` | Cổng thanh toán VNPay, sử dụng để tạo URL thanh toán và tiếp nhận kết quả giao dịch thông qua IPN. |

Trường `Payment.gateway` liên kết mỗi Payment với cổng thanh toán tương ứng.

Các quy tắc:

- Payment sử dụng Mock Gateway phải được ghi nhận với gateway tương ứng là `MOCK`.
- Payment sử dụng VNPay phải được ghi nhận với gateway tương ứng là `VNPAY`.
- Khi xử lý VNPay IPN, hệ thống phải đối chiếu Payment theo mã tham chiếu giao dịch và gateway `VNPAY`.
- Không xử lý một Payment thuộc `MOCK` như một giao dịch VNPay.
- Giá trị enum và tên PostgreSQL thực tế cần đối chiếu với khai báo enum trong `schema.prisma` và migration.

## 4. Quan hệ với Order và chuyển đổi trạng thái

### 4.1. Quan hệ Order – Payment

- Một `Order` có thể liên kết với nhiều bản ghi `Payment` theo quan hệ 1-N.
- Trường `Payment.orderId` không được đặt `@unique`, cho phép lưu nhiều lần thử thanh toán cho cùng một Order.
- Mỗi lần retry là một lần thử mới và phải sử dụng `idempotencyKey` mới.
- Mỗi Payment ghi nhận gateway được sử dụng thông qua trường `gateway`.
- Payment VNPay lưu `paymentUrl` và thông tin giao dịch phục vụ việc đối chiếu kết quả thanh toán.

### 4.2. Thanh toán thành công

Khi Payment được xác nhận thành công:

- `Payment.status` chuyển sang `SUCCESS`.
- `Order.status` chuyển sang `PAID` thông qua `OrderService.transition()`.
- `Order.paidAt` được ghi nhận theo logic của `OrderService.transition()`.
- `LoyaltyService.award()` xử lý điểm thưởng theo thiết kế; không cộng điểm thưởng lần nữa khi replay cùng request.
- Đối với VNPay, hệ thống lưu mã giao dịch từ gateway vào `gatewayTransactionNo` khi có dữ liệu tương ứng.

### 4.3. Thanh toán thất bại – Quyết định D1

Khi gateway trả về kết quả thất bại được xác nhận:

- `Payment.status` chuyển sang `FAILED`.
- `Order.status` chuyển sang `PAYMENT_FAILED` thông qua `OrderService.transition()`.
- Không đánh dấu Order là `PAID`.
- Frontend giữ nguyên giỏ hàng theo luồng xử lý hiện tại.
- **`Ingredient.stock` không bị thay đổi do riêng luồng Payment.** Payment không trực tiếp trừ hoặc hoàn tồn kho nguyên liệu.

### 4.4. Quy tắc retry

- Khách hàng có thể thử lại theo state machine và các quy tắc nghiệp vụ đã thống nhất; không áp dụng giới hạn ba lần hoặc khóa vĩnh viễn ở `PAYMENT_FAILED`. Với VNPay, Payment `PENDING` quá 15 phút được chuyển `FAILED` (`failureReason = "Hết hạn thanh toán VNPay (15 phút)"`) khi khách tạo lại thanh toán.
- Khi retry, Order chuyển `PAYMENT_FAILED → PENDING` thông qua `OrderService.transition()`.
- Mỗi lần thử mới tạo một bản ghi Payment mới với `idempotencyKey` mới.
- Nếu lần thử tiếp theo thất bại, Order chuyển về `PAYMENT_FAILED`. Nếu thành công, Order chuyển sang `PAID`.
- Retry không trực tiếp thay đổi `Ingredient.stock`.
- Đối với VNPay, mỗi lần thử thanh toán mới cần có mã tham chiếu giao dịch tương ứng để đối chiếu kết quả IPN.
- Với VNPay, Order chỉ có tối đa một Payment `PENDING` còn hạn; yêu cầu mới trong thời hạn trả lại Payment cũ thay vì tạo bản ghi mới.
- `Payment.failureReason` cho VNPay có thể là: `VNPay response: <code>, transaction status: <status>` (giao dịch thất bại), `Hết hạn thanh toán VNPay (15 phút)`, hoặc `Cần hoàn tiền thủ công: đơn đang ở trạng thái <status>` (IPN thành công nhưng Order không còn `PENDING`; Payment ở `SUCCESS`, cần hoàn tiền ngoài hệ thống).

### 4.5. Timeout và kết quả chưa xác định

Timeout không mặc nhiên đồng nghĩa với thất bại đã được xác nhận.

Cách ghi nhận Payment, chuyển trạng thái Order và cho phép retry khi gateway chưa xác định kết quả phải tuân theo thiết kế timeout được thống nhất. Không suy diễn timeout thành `FAILED` nếu chưa có quy tắc tương ứng trong code và API contract.

Đối với VNPay, hệ thống cần phân biệt giữa việc tạo URL thanh toán thành công và việc nhận được kết quả giao dịch đã xác thực thông qua IPN.

## 5. Mapping và xử lý dữ liệu VNPay

### 5.1. Khi tạo URL thanh toán

Khi khách hàng chọn VNPay:

1. Backend tạo bản ghi `Payment` với gateway `VNPAY`.
2. Payment được khởi tạo ở trạng thái `PENDING`.
3. Backend tạo mã tham chiếu giao dịch (`transactionRef`) để đối chiếu giao dịch.
4. Backend gọi VNPay Gateway để tạo URL thanh toán.
5. URL nhận được được lưu vào trường `paymentUrl`.
6. Backend trả thông tin thanh toán cho frontend để chuyển người dùng đến trang thanh toán VNPay.

Việc tạo URL thành công không đồng nghĩa với việc giao dịch đã thanh toán thành công. Payment và Order vẫn giữ trạng thái `PENDING` cho đến khi kết quả giao dịch được xác nhận.

### 5.2. Khi tiếp nhận VNPay IPN

VNPay gửi thông tin kết quả giao dịch đến endpoint IPN của Backend.

Backend thực hiện các bước xử lý:

1. Tiếp nhận các query parameters từ VNPay.
2. Xác thực chữ ký của dữ liệu nhận được bằng cơ chế HMAC SHA512 theo cấu hình VNPay.
3. Kiểm tra các dữ liệu bắt buộc của giao dịch.
4. Đối chiếu mã tham chiếu giao dịch với Payment có gateway `VNPAY`.
5. Kiểm tra số tiền giao dịch với số tiền Payment đã lưu.
6. Kiểm tra trạng thái hiện tại của Payment để tránh xử lý lại giao dịch đã được xác nhận.
7. Cập nhật Payment và chuyển trạng thái Order thông qua `OrderService.transition()` theo kết quả giao dịch.
8. Nếu giao dịch thành công, xử lý điểm thưởng thông qua `LoyaltyService.award()`.

### 5.3. Ý nghĩa các trường giao dịch VNPay

| Trường | Vai trò |
|---|---|
| `gateway` | Xác định Payment sử dụng VNPay (`VNPAY`). |
| `transactionRef` | Mã tham chiếu do hệ thống tạo, dùng để tìm Payment tương ứng khi nhận IPN. |
| `gatewayTransactionNo` | Mã giao dịch do VNPay cung cấp, dùng để lưu thông tin giao dịch từ gateway. |
| `paymentUrl` | URL thanh toán do VNPay trả về sau khi Backend tạo yêu cầu thanh toán. |
| `amount` | Số tiền Payment được lưu trong hệ thống và dùng đối chiếu với số tiền VNPay gửi về. |
| `status` | Trạng thái xử lý thanh toán của Payment. |

`transactionRef` và `gatewayTransactionNo` có mục đích khác nhau: trường thứ nhất dùng để hệ thống nhận diện giao dịch, trường thứ hai lưu mã giao dịch do gateway cung cấp.

## 6. Các quy tắc dữ liệu

1. `idempotencyKey` phải duy nhất toàn hệ thống, được bảo đảm bằng constraint tương ứng trong schema.
2. `amount` được Backend lấy từ `Order.finalAmount`, không tin cậy số tiền do client gửi.
3. Không chuyển Order sang `PAID` khi Payment thất bại.
4. Cùng `idempotencyKey` và cùng nội dung request: trả kết quả Payment đã lưu, không tạo Payment trùng và không xử lý thanh toán lại.
5. Cùng key nhưng nội dung request khác: trả `409 Conflict`.
6. Retry sau thất bại phải sử dụng key mới; replay sử dụng key cũ và cùng payload.
7. HTTP status khi replay phải thống nhất với API contract và hành vi thực tế của controller. Không mặc định mọi replay đều trả `201 Created` nếu chưa xác minh response của endpoint.
8. Quan hệ `Order` – `Payment` cho phép nhiều lần thử; không đặt unique constraint trên `Payment.orderId` nếu thiết kế này vẫn được áp dụng.
9. Trong phạm vi Payment, `Ingredient.stock` phải được bảo toàn khi thanh toán thất bại, retry hoặc replay, trừ khi có nghiệp vụ độc lập khác được xác định rõ ràng. Payment không được trực tiếp gọi `deductIngredients()` hoặc `restoreIngredients()` để xử lý kết quả thanh toán.
10. Tồn kho nguyên liệu được xác định bằng `Ingredient.stock`; không dùng `Product.stock` hoặc `Topping.stock` đã deprecated làm căn cứ nghiệm thu.
11. Payment phải ghi nhận đúng `gateway` tương ứng với cổng thanh toán được sử dụng.
12. VNPay IPN chỉ được xử lý sau khi xác thực chữ ký và kiểm tra dữ liệu giao dịch.
13. Mã tham chiếu giao dịch phải được đối chiếu với Payment thuộc gateway `VNPAY`.
14. Không xử lý lại giao dịch VNPay đã được xác nhận trước đó.
15. `gatewayTransactionNo` chỉ lưu mã giao dịch do gateway cung cấp; không sử dụng thay thế cho `transactionRef`.
16. `paymentUrl` lưu URL thanh toán được tạo từ gateway, không được xem là bằng chứng giao dịch đã thành công.

## 7. Lưu ý

- Đối chiếu tài liệu với `schema.prisma` và migration thực tế trước khi xác nhận mapping cuối cùng.
- Kiểm tra `@map`, `@@map`, kiểu enum, kiểu số tiền, khóa ngoại và constraint thực tế; không suy ra toàn bộ cấu trúc PostgreSQL chỉ từ tên field Prisma.
- `OrderService.transition()` là nơi xử lý chuyển trạng thái Order theo thiết kế hiện tại. Payment không tự cập nhật `Order.status` trực tiếp nếu kiến trúc yêu cầu sử dụng service này.
- Kiểm thử unit có thể xác nhận Payment không gọi trực tiếp các phương thức cập nhật tồn kho. Để xác nhận dữ liệu thật, cần kiểm tra `Ingredient.stock` trước và sau các request thất bại, retry và replay trên database.
- Không ghi nhận yêu cầu hoặc kết quả kiểm thử là `Pass` khi chưa có bằng chứng kiểm thử thực tế.
- Việc tạo URL VNPay và tiếp nhận IPN là hai giai đoạn riêng biệt; tạo URL thành công không chứng minh giao dịch đã thanh toán thành công.
- Chỉ cập nhật trạng thái Payment và Order sau khi kết quả giao dịch đáp ứng các điều kiện xác thực và đối chiếu theo implementation.
- Tên column, kiểu dữ liệu, giá trị mặc định và constraint của ba trường VNPay phải được xác nhận theo migration `20261031165700_add_payment_gateway` và `schema.prisma`.

## 8. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo tài liệu Database Mapping Payment.
- v1.1 (2026-10-16): Áp dụng quyết định D1.
- v1.2 (2026-10-29): Làm rõ quy tắc idempotency, retry, mapping cần đối chiếu với schema thực tế và yêu cầu bảo toàn `Ingredient.stock` trong phạm vi Payment.
- v1.3 (2026-10-31): Bổ sung mapping các trường `gateway`, `gatewayTransactionNo`, `paymentUrl`; bổ sung enum `PaymentGateway` và mô tả dữ liệu giao dịch VNPay.