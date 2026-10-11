# Database Mapping – Payment

## 1. Mục tiêu

Mô tả mapping giữa Prisma model `Payment`, model `Order` và các cột tương ứng trong PostgreSQL.

## 2. Mapping Payment

| Prisma field | Database column | Kiểu dữ liệu / Ý nghĩa |
|---|---|---|
| `id` | `id` | String, khóa chính |
| `orderId` | `order_id` | String, khóa ngoại tới `orders.id` |
| `idempotencyKey` | `idempotency_key` | String, duy nhất |
| `requestHash` | `request_hash` | String tùy chọn, dùng đối chiếu nội dung request |
| `amount` | `amount` | Decimal(12,0), số tiền giao dịch |
| `method` | `method` | Enum `E_WALLET` hoặc `BANK_CARD` |
| `status` | `status` | Enum `PENDING`, `SUCCESS`, `FAILED` |
| `failureReason` | `failure_reason` | String tùy chọn |
| `transactionRef` | `transaction_ref` | String tùy chọn, mã giao dịch |
| `createdAt` | `created_at` | DateTime, thời điểm tạo |

Tên bảng trong database: `payments`.

## 3. Quan hệ với Order

- Một Order có thể có nhiều Payment records nếu hệ thống cho phép thử thanh toán lại sau lần thất bại.
- Mỗi Payment thuộc về một Order thông qua `orderId`.
- `Order.status` được cập nhật thành `PAID` khi thanh toán được xác nhận thành công.
- `Order.paidAt` lưu thời điểm thanh toán thành công nếu trường này được sử dụng theo schema hiện tại.

## 4. Các quy tắc dữ liệu

- `idempotencyKey` phải duy nhất.
- `amount` được xác định từ dữ liệu đơn hàng ở Backend.
- Không đánh dấu Order là `PAID` khi Payment thất bại hoặc chưa rõ kết quả.
- Không tạo giao dịch trùng khi nhận lại cùng yêu cầu.
- Việc thử lại sau thất bại phải tuân theo quy tắc nghiệp vụ và sử dụng key mới.

## 5. Lưu ý

Tài liệu này cần được đối chiếu với `schema.prisma` thực tế của nhóm trước khi migration. Kiểu dữ liệu PostgreSQL cuối cùng phụ thuộc schema và migration đã áp dụng.
