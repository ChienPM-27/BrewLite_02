# Database Mapping – Payment

## 1. Mục tiêu

Mô tả mapping giữa Prisma model `Payment`, model `Order` và các cột tương ứng trong PostgreSQL; làm rõ quan hệ dữ liệu, quy tắc chuyển trạng thái, idempotency, retry và yêu cầu bảo toàn tồn kho nguyên liệu trong phạm vi luồng Payment.

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
| `failureReason` | `failure_reason` | Chuỗi tùy chọn ghi nhận nguyên nhân thất bại. |
| `transactionRef` | `transaction_ref` | Chuỗi tùy chọn lưu mã giao dịch từ gateway. |
| `createdAt` | `created_at` | Thời điểm tạo Payment. |

Tên bảng: `payments`.

Tên cột phía database nêu trên giả định schema sử dụng mapping tương ứng, chẳng hạn `@map("order_id")`. Cần đối chiếu `schema.prisma` và migration đã áp dụng để xác nhận tên cột, kiểu dữ liệu và constraint thực tế.

## 3. Quan hệ với Order và chuyển đổi trạng thái

### 3.1. Quan hệ Order – Payment

- Một `Order` có thể liên kết với nhiều bản ghi `Payment` theo quan hệ 1-N.
- Trường `Payment.orderId` không được đặt `@unique`, cho phép lưu nhiều lần thử thanh toán cho cùng một Order.
- Mỗi lần retry là một lần thử mới và phải sử dụng `idempotencyKey` mới.

### 3.2. Thanh toán thành công

Khi Payment được xác nhận thành công:

- `Payment.status` chuyển sang `SUCCESS`.
- `Order.status` chuyển sang `PAID` thông qua `OrderService.transition()`.
- `Order.paidAt` được ghi nhận theo logic của `OrderService.transition()`.
- `LoyaltyService.award()` xử lý điểm thưởng theo thiết kế; không cộng điểm thưởng lần nữa khi replay cùng request.

### 3.3. Thanh toán thất bại – Quyết định D1

Khi gateway trả về kết quả thất bại được xác nhận:

- `Payment.status` chuyển sang `FAILED`.
- `Order.status` chuyển sang `PAYMENT_FAILED` thông qua `OrderService.transition()`.
- Không đánh dấu Order là `PAID`.
- Frontend giữ nguyên giỏ hàng theo luồng xử lý hiện tại.
- **`Ingredient.stock` không bị thay đổi do riêng luồng Payment.** Payment không trực tiếp trừ hoặc hoàn tồn kho nguyên liệu.

### 3.4. Quy tắc retry

- Khách hàng có thể thử lại theo state machine và các quy tắc nghiệp vụ đã thống nhất; không áp dụng giới hạn ba lần, thời hạn 15 phút hoặc khóa vĩnh viễn ở `PAYMENT_FAILED` nếu các giới hạn này đã được loại bỏ khỏi thiết kế.
- Khi retry, Order chuyển `PAYMENT_FAILED → PENDING` thông qua `OrderService.transition()`.
- Mỗi lần thử mới tạo một bản ghi Payment mới với `idempotencyKey` mới.
- Nếu lần thử tiếp theo thất bại, Order chuyển về `PAYMENT_FAILED`. Nếu thành công, Order chuyển sang `PAID`.
- Retry không trực tiếp thay đổi `Ingredient.stock`.

### 3.5. Timeout và kết quả chưa xác định

Timeout không mặc nhiên đồng nghĩa với thất bại đã được xác nhận. Cách ghi nhận Payment, chuyển trạng thái Order và cho phép retry khi gateway chưa xác định kết quả phải tuân theo thiết kế timeout được thống nhất. Không suy diễn timeout thành `FAILED` nếu chưa có quy tắc tương ứng trong code và API contract.

## 4. Các quy tắc dữ liệu

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

## 5. Lưu ý

- Đối chiếu tài liệu với `schema.prisma` và migration thực tế trước khi xác nhận mapping cuối cùng.
- Kiểm tra `@map`, `@@map`, kiểu enum, kiểu số tiền, khóa ngoại và constraint thực tế; không suy ra toàn bộ cấu trúc PostgreSQL chỉ từ tên field Prisma.
- `OrderService.transition()` là nơi xử lý chuyển trạng thái Order theo thiết kế hiện tại. Payment không tự cập nhật `Order.status` trực tiếp nếu kiến trúc yêu cầu sử dụng service này.
- Kiểm thử unit có thể xác nhận Payment không gọi trực tiếp các phương thức cập nhật tồn kho. Để xác nhận dữ liệu thật, cần kiểm tra `Ingredient.stock` trước và sau các request thất bại, retry và replay trên database.
- Không ghi nhận yêu cầu hoặc kết quả kiểm thử là `Pass` khi chưa có bằng chứng kiểm thử thực tế.

## 6. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo tài liệu Database Mapping Payment.
- v1.1 (2026-10-16): Áp dụng quyết định D1.
- v1.2 (2026-10-29): Làm rõ quy tắc idempotency, retry, mapping cần đối chiếu với schema thực tế và yêu cầu bảo toàn `Ingredient.stock` trong phạm vi Payment.
