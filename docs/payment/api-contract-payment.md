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

## 3. Response – Thành công

HTTP `200 OK` hoặc mã thành công khác theo quy ước chung của Backend.

```json
{
  "id": "payment_001",
  "orderId": "order_001",
  "amount": 65000,
  "method": "E_WALLET",
  "status": "SUCCESS",
  "transactionRef": "mock_txn_001",
  "failureReason": null
}
```

## 4. Response – Thất bại

```json
{
  "id": "payment_001",
  "orderId": "order_001",
  "amount": 65000,
  "method": "E_WALLET",
  "status": "FAILED",
  "transactionRef": null,
  "failureReason": "Mock payment declined"
}
```

## 5. Response – Đang xác minh

Nếu chưa xác định được kết quả giao dịch, Payment giữ trạng thái `PENDING`. Frontend thông báo giao dịch đang được xác minh và không tự động gửi giao dịch mới.

## 6. Mã lỗi dự kiến

| HTTP Status | Trường hợp |
|---|---|
| `400 Bad Request` | Thiếu hoặc sai dữ liệu đầu vào |
| `401 Unauthorized` | Chưa đăng nhập hoặc token không hợp lệ |
| `403 Forbidden` | Không có quyền thanh toán đơn hàng |
| `404 Not Found` | Không tìm thấy đơn hàng |
| `409 Conflict` | Idempotency-Key bị dùng với nội dung khác hoặc đơn hàng không đủ điều kiện |
| `500 Internal Server Error` | Lỗi hệ thống |

## 7. Quy tắc Idempotency

- Cùng key, cùng nội dung: trả kết quả đã lưu hoặc trạng thái hiện tại.
- Cùng key, khác nội dung: từ chối yêu cầu.
- Các request đồng thời dùng cùng key không được tạo nhiều giao dịch.
- Nếu lần trước đã xác nhận thất bại, lần thử mới phải sử dụng key mới và đơn hàng phải còn đủ điều kiện.

## 8. Lưu ý triển khai

Các HTTP status và cấu trúc response trên là hợp đồng đề xuất. Cần thống nhất với Backend trước khi triển khai để tránh Frontend và Backend xử lý khác nhau.
