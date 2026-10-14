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

## 3. Quan hệ với Order và Chuyển đổi trạng thái

- **Quan hệ 1 - N (Order - Payments):** Một `Order` có thể liên kết với nhiều bản ghi `Payment` (quan hệ 1-N trong `schema.prisma`, trường `orderId` trong `payments` không có `@unique`) nhằm cho phép khách hàng thực hiện nhiều lượt thử thanh toán (Retry) khi các lượt trước bị thất bại.
- **Thanh toán thành công:** Khi bản ghi Payment đạt trạng thái `SUCCESS`:
  - `Order.status` chuyển từ `PENDING` sang `PAID`.
  - `Order.paidAt` lưu thời điểm thanh toán thành công (`now()`).
- **Thanh toán thất bại từng lượt:** Khi một bản ghi Payment chuyển trạng thái `FAILED`:
  - `Order.status` vẫn **giữ nguyên `PENDING`** để khách hàng có thể đổi phương thức thanh toán hoặc thử lại với `idempotencyKey` mới.
- **Làm rõ trạng thái `OrderStatus.PAYMENT_FAILED` (từ `schema.prisma`):**
  - Trạng thái `PAYMENT_FAILED` của `Order` **không** được gán ngay sau một lần giao dịch thất bại đơn lẻ.
  - Trạng thái này được kích hoạt khi đơn hàng đã vượt quá số lần thử thanh toán cho phép (đề xuất tối đa 3 lần thất bại) hoặc quá thời hạn thanh toán (đề xuất sau 15 phút).
  - Khi `Order.status = PAYMENT_FAILED`, đơn hàng bị khóa thanh toán vĩnh viễn, giải phóng tồn kho (`stock`), và có thể chuyển tiếp sang `CANCELLED`.
  - *(Chi tiết số lần retry tối đa và thời gian timeout thuộc mục ĐỀ XUẤT – cần nhóm xác nhận).*

## 4. Các quy tắc dữ liệu

- `idempotencyKey` phải duy nhất toàn hệ thống (`@unique`).
- `amount` bắt buộc được trích xuất từ `Order.finalAmount` ở Backend, không tin cậy dữ liệu client.
- Không đánh dấu Order là `PAID` khi Payment thất bại hoặc chưa rõ kết quả (`PENDING`).
- Không tạo giao dịch trùng khi nhận lại cùng `idempotencyKey` và cùng request hash/payload.
- Việc thử lại sau thất bại phải tuân theo quy tắc nghiệp vụ và bắt buộc sử dụng `idempotencyKey` mới.

## 5. Lưu ý

Tài liệu này cần được đối chiếu với `schema.prisma` thực tế của nhóm trước khi migration. Kiểu dữ liệu PostgreSQL cuối cùng phụ thuộc schema và migration đã áp dụng.
