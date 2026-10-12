# API Contract – Payment

## 1. Endpoint

- **Method:** `POST`
- **URL:** `/api/v1/payments`
- **Content-Type:** `application/json`
- **Authentication:** Bearer Token
- **Idempotency:** Sử dụng header `Idempotency-Key`

## 2. Request

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: pay-order001-attempt001
```

### Body

```json
{
  "orderId": "order_001",
  "method": "E_WALLET"
}
```

`method` chỉ chấp nhận `E_WALLET` hoặc `BANK_CARD`.

Backend phải lấy số tiền từ đơn hàng trong database, không sử dụng số tiền do Frontend gửi để quyết định số tiền giao dịch.

## 3. Phản hồi khi thành công (Success Response)

Tất cả các API thành công (`200 OK` hoặc `201 Created`) đều được bọc tự động qua `TransformInterceptor` theo quy chuẩn của nhóm (`docs/checklist-review.md`).

**HTTP Status:** `201 Created` (hoặc `200 OK` khi trả về kết quả idempotency đã hoàn tất trước đó).

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "payment_001",
    "orderId": "order_001",
    "amount": 65000,
    "method": "E_WALLET",
    "status": "SUCCESS",
    "transactionRef": "mock_txn_001",
    "failureReason": null,
    "createdAt": "2026-10-11T12:00:00.000Z"
  },
  "timestamp": "2026-10-11T12:00:00.000Z"
}
```

## 4. Phản hồi khi giao dịch thất bại hoặc lỗi

### 4.1. Giao dịch bị từ chối từ cổng thanh toán (Payment Failed)

Khi cổng thanh toán từ chối (hoặc tài khoản không đủ số dư), bản ghi Payment được cập nhật trạng thái `FAILED`, phản hồi thành công về mặt HTTP hoặc trả về kết quả thanh toán thất bại trong `data`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "payment_001",
    "orderId": "order_001",
    "amount": 65000,
    "method": "E_WALLET",
    "status": "FAILED",
    "transactionRef": null,
    "failureReason": "Số dư không đủ hoặc thẻ bị khóa",
    "createdAt": "2026-10-11T12:00:00.000Z"
  },
  "timestamp": "2026-10-11T12:00:00.000Z"
}
```

- **Trạng thái đơn hàng (Order Status):** Sau khi Payment bị `FAILED`, đơn hàng vẫn giữ nguyên `PENDING` (khi chưa vượt quá số lần retry tối đa) để khách hàng có thể thử lại.
- **Vượt quá số lần thử (Max Retries):** Nếu khách hàng thử thất bại quá số lần quy định (đề xuất tối đa 3 lần) hoặc quá thời hạn thanh toán (đề xuất 15 phút), đơn hàng sẽ chuyển sang trạng thái `OrderStatus.PAYMENT_FAILED` và bị khóa thanh toán. Khách hàng không thể tiếp tục gửi request thanh toán cho đơn hàng này.

### 4.2. Giao dịch đang chờ xác minh (Pending / Timeout)

Nếu cổng thanh toán timeout hoặc chưa xác định kết quả:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "payment_001",
    "orderId": "order_001",
    "amount": 65000,
    "method": "E_WALLET",
    "status": "PENDING",
    "transactionRef": null,
    "failureReason": null,
    "createdAt": "2026-10-11T12:00:00.000Z"
  },
  "timestamp": "2026-10-11T12:00:00.000Z"
}
```

Frontend thông báo giao dịch đang được xác minh và không tự động gửi giao dịch mới.

### 4.3. Phản hồi lỗi hệ thống / nghiệp vụ (Error Responses)

Khi xảy ra lỗi (Status code 400, 401, 403, 404, 409, 500), response được bọc tự động qua `AllExceptionsFilter`:

| HTTP Status | Trường hợp | Ví dụ `message` |
|---|---|---|
| `400 Bad Request` | Thiếu hoặc sai định dạng DTO | `["orderId must be a string", "method must be a valid enum value"]` |
| `400 Bad Request` / `409 Conflict` | Đơn hàng không ở trạng thái `PENDING` (đã `PAID`, `CANCELLED` hoặc `PAYMENT_FAILED` do quá số lần thử/timeout) | `"Đơn hàng không ở trạng thái hợp lệ để thanh toán"` |
| `401 Unauthorized` | Chưa đăng nhập hoặc token không hợp lệ | `"Unauthorized"` |
| `403 Forbidden` | Không có quyền thanh toán đơn hàng này | `"Bạn không có quyền thanh toán đơn hàng này"` |
| `404 Not Found` | Không tìm thấy đơn hàng | `"Không tìm thấy đơn hàng"` |
| `409 Conflict` | Idempotency-Key trùng với payload khác hoặc đơn đã thanh toán | `"Idempotency key đã được sử dụng với thông tin khác"` |
| `500 Internal Server Error` | Lỗi máy chủ không mong muốn | `"Đã xảy ra lỗi không mong muốn"` |

**Ví dụ lỗi 409 Conflict:**
```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Idempotency key đã được sử dụng với thông tin khác",
  "timestamp": "2026-10-11T12:00:00.000Z",
  "path": "/api/v1/payments"
}
```

## 5. Quy tắc Idempotency & Thử lại (Retry Policy)

- **Cùng key, cùng nội dung:** Backend trả lại kết quả giao dịch đã lưu trong `payments` hoặc trạng thái hiện tại mà không tạo thêm giao dịch mới.
- **Cùng key, khác nội dung:** Backend ném `409 Conflict` từ chối yêu cầu.
- **Xử lý đồng thời (Concurrency):** Ràng buộc `unique` trên `idempotency_key` đảm bảo không bao giờ phát sinh 2 bản ghi thanh toán trùng nhau.
- **Retry sau thất bại:** Khi giao dịch trước đã xác nhận `FAILED`, khách hàng bấm "Thử lại" thì Frontend **bắt buộc phải sinh Idempotency-Key mới** và đơn hàng phải còn đủ điều kiện (`PENDING`, chưa vượt quá số lần retry tối đa — đề xuất tối đa 3 lần).
- **Khóa đơn hàng khi hết lượt thử:** Nếu đơn hàng đã vượt quá số lần retry cho phép hoặc quá thời hạn thanh toán (đề xuất 15 phút), đơn hàng chuyển sang `OrderStatus.PAYMENT_FAILED` và hệ thống sẽ từ chối mọi yêu cầu thanh toán tiếp theo.

## 6. Hợp đồng Mock Payment Gateway (Mock Gateway Contract)

Để phục vụ phát triển độc lập và kiểm thử tự động mà không phụ thuộc cổng thanh toán thực tế, hệ thống định nghĩa service `MockPaymentGatewayService` với các quy ước kịch bản test như sau:

### 6.1. Interface giả lập

```typescript
export interface MockPaymentRequest {
  orderId: string;
  amount: number;
  method: 'E_WALLET' | 'BANK_CARD';
  paymentRef: string; // ví dụ mã tham chiếu nội bộ
}

export interface MockPaymentResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionRef?: string;
  failureReason?: string;
}
```

### 6.2. Ma trận quy tắc kịch bản Test (Test Triggers)

Mock Gateway sẽ quyết định kết quả dựa trên mã đơn hàng (`orderId`) hoặc mã tham chiếu được chỉ định trong môi trường test/dev:

| Kịch bản | Quy tắc kích hoạt (Trigger rule) | Kết quả trả về | Hành vi hệ thống |
|---|---|---|---|
| **Thanh toán thành công** | Mặc định mọi order bình thường (hoặc ID kết thúc bằng chẵn: `0`, `2`, `4`...) | `status: SUCCESS`, có `transactionRef: "MOCK_TXN_..."` | Payment $\rightarrow$ `SUCCESS`, Order $\rightarrow$ `PAID` |
| **Thanh toán thất bại (Số dư không đủ)** | ID đơn hàng hoặc test flag kết thúc bằng `99` (VD: `order_fail_99`) | `status: FAILED`, `failureReason: "Số dư ví/tài khoản không đủ"` | Payment $\rightarrow$ `FAILED`, Order giữ `PENDING`, cho phép retry |
| **Thẻ/Tài khoản bị khóa** | ID đơn hàng hoặc test flag kết thúc bằng `98` | `status: FAILED`, `failureReason: "Thẻ ngân hàng bị khóa hoặc hết hạn"` | Payment $\rightarrow$ `FAILED`, Order giữ `PENDING` |
| **Cổng thanh toán Timeout** | ID đơn hàng hoặc test flag kết thúc bằng `88` (VD: `order_timeout_88`) | Timeout quá 5s hoặc trả về `status: PENDING` | Payment giữ `PENDING`, hiển thị đang đối soát |

## 7. Lưu ý tích hợp Frontend & Backend

- Frontend hiển thị `amount` lấy từ đơn hàng, nhưng khi submit `POST /api/v1/payments` không gửi trường `amount` trong body.
- Frontend chịu trách nhiệm tự sinh UUID/CUID cho header `Idempotency-Key` mỗi lần người dùng bấm xác nhận thanh toán (và sinh key mới khi retry).
- Frontend cần kiểm tra `data.status` (`SUCCESS`, `FAILED`, `PENDING`) để render màn hình kết quả tương ứng.
