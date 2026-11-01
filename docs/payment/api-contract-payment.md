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

Đối với thanh toán qua VNPay, Backend sử dụng gateway `VNPAY` theo lựa chọn cổng thanh toán được hỗ trợ trong request DTO và implementation hiện tại.

## 3. Phản hồi khi thành công (Success Response)

Tất cả các API thành công (`200 OK` hoặc `201 Created`) đều được bọc tự động qua `TransformInterceptor` theo quy chuẩn của nhóm (`docs/checklist-review.md`).

**HTTP Status:** `201 Created` (thống nhất `201 Created` cho cả lần tạo đầu và khi trả về kết quả idempotency đã hoàn tất trước đó).

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

Khi cổng thanh toán từ chối (hoặc tài khoản không đủ số dư), bản ghi Payment được cập nhật trạng thái `FAILED`, đồng thời đơn hàng chuyển trạng thái `PENDING → PAYMENT_FAILED` (thông qua `OrderService.transition`). Phản hồi trả về kết quả thanh toán thất bại trong `data`:

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

- **Trạng thái đơn hàng (Order Status):** Khi thanh toán thất bại, đơn hàng chuyển sang `PAYMENT_FAILED`.
- **Thử lại thanh toán (Retry):** Khách hàng có thể thử lại thanh toán không giới hạn số lần. Khi khách hàng bấm "Thử lại", hệ thống chuyển đơn hàng `PAYMENT_FAILED → PENDING` (thông qua `OrderService.transition`), sau đó tiến hành thanh toán với một `Idempotency-Key` MỚI. Giỏ hàng tại Frontend được giữ nguyên khi thanh toán thất bại.
- **Xử lý Timeout:** Theo thiết kế MVP hiện tại, Gateway timeout được xử lý là `FAILED` với `failureReason: "Gateway timeout"` và đơn hàng chuyển sang `PAYMENT_FAILED` (không duy trì trạng thái treo PENDING hay đối soát bất đồng bộ trong MVP).

### 4.2. Phản hồi lỗi hệ thống / nghiệp vụ (Error Responses)

Khi xảy ra lỗi (Status code 400, 401, 403, 404, 409, 500), response được bọc tự động qua `AllExceptionsFilter`:

| HTTP Status | Trường hợp | Ví dụ `message` |
|---|---|---|
| `400 Bad Request` | Thiếu hoặc sai định dạng DTO | `["orderId must be a string", "method must be a valid enum value"]` |
| `401 Unauthorized` | Chưa đăng nhập hoặc token không hợp lệ | `"Unauthorized"` |
| `403 Forbidden` | Không có quyền thanh toán đơn hàng này | `"Bạn không có quyền thanh toán đơn hàng này"` |
| `404 Not Found` | Không tìm thấy đơn hàng | `"Không tìm thấy đơn hàng"` |
| `409 Conflict` | Đơn hàng không ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` (ví dụ: đã `PAID`, `CANCELLED`, `PREPARING`...) | `"Đơn hàng không ở trạng thái hợp lệ để thanh toán"` |
| `409 Conflict` | Idempotency-Key trùng với nội dung request khác (`requestHash` không khớp) | `"Idempotency key đã được sử dụng với thông tin khác"` |
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

- **Cùng key, cùng nội dung:** Backend trả lại kết quả giao dịch đã lưu trong `payments` (HTTP 201 Created) mà không tạo Payment mới hay gọi lại Mock Gateway.
- **Cùng key, khác nội dung (`requestHash`):** Backend ném `409 Conflict` từ chối yêu cầu.
- **Xử lý đồng thời (Concurrency):** Ràng buộc `unique` trên `idempotency_key` đảm bảo không phát sinh hai bản ghi thanh toán trùng nhau. Với các request đồng thời dùng cùng key, request thua cuộc (bị lỗi unique constraint) phải truy vấn và trả về kết quả đã lưu (HTTP 201 Created), tuyệt đối không được trả lỗi 500.
- **Retry sau thất bại:** Khi giao dịch thất bại (`FAILED`), khách hàng bấm "Thử lại":
  1. Frontend chuyển đơn hàng `PAYMENT_FAILED → PENDING` qua `OrderService.transition`.
  2. Frontend bắt buộc phải sinh một `Idempotency-Key` mới.
  3. Hệ thống cho phép thử lại không giới hạn số lần (đã gỡ bỏ giới hạn 3 lần và scheduler tự động hết hạn đơn 15 phút ở D6). Riêng link thanh toán VNPay có thời hạn 15 phút, xem mục 5.1.
- **Giỏ hàng:** Frontend KHÔNG xóa giỏ hàng khi tạo đơn hoặc khi thanh toán lỗi. Chỉ xóa giỏ hàng (`clearCart()` và xóa `pendingOrderId`) khi thanh toán `SUCCESS` (đơn hàng đạt trạng thái `PAID`).

### 5.1. Quy tắc riêng cho thanh toán VNPay (gateway `VNPAY`)

- **Thời hạn link:** URL thanh toán chứa `vnp_ExpireDate` = thời điểm tạo + 15 phút. Đây là thời hạn của *link thanh toán*, không phải thời hạn của Order (không có scheduler hủy đơn, theo D6).
- **Tái sử dụng payment đang chờ:** Khi `POST /payments` với `gateway = VNPAY` mà Order đã có Payment VNPay `PENDING` còn trong 15 phút (và có `paymentUrl`), Backend trả lại Payment đó, **không tạo Payment mới**, kể cả khi `Idempotency-Key` khác. Mục đích: tránh khách bị trừ tiền hai lần.
- **Payment hết hạn:** Nếu Payment VNPay `PENDING` đã quá 15 phút, Backend chuyển Payment đó sang `FAILED` với `failureReason = "Hết hạn thanh toán VNPay (15 phút)"` rồi tạo Payment mới.
- Tạo URL không chuyển Order sang `PAID`; kết quả chỉ được xác nhận qua IPN (mục 8).

## 6. Hợp đồng Mock Payment Gateway (Mock Gateway Contract)

Để phục vụ phát triển độc lập và kiểm thử tự động mà không phụ thuộc cổng thanh toán thực tế, hệ thống định nghĩa service `MockPaymentGatewayService` với các quy ước kịch bản như sau:

### 6.1. Interface giả lập

```typescript
export interface MockPaymentRequest {
  orderId: string;
  amount: number;
  method: 'E_WALLET' | 'BANK_CARD';
  paymentRef: string;
  mockOutcome?: 'SUCCESS' | 'FAILED';
}

export interface MockPaymentResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED';
  transactionRef?: string;
  failureReason?: string;
}
```

### 6.2. Quy tắc kích hoạt kết quả Mock (Mock Trigger Rule - D8)

- **Cơ chế điều khiển qua Header:** Bỏ quy tắc kích hoạt theo hậu tố ID đơn hàng. Kết quả thanh toán giả lập được điều khiển trực tiếp qua HTTP Header:

```http
X-Mock-Outcome: SUCCESS | FAILED
```

- **Mặc định:** Nếu không truyền header `X-Mock-Outcome`, Mock Gateway mặc định xử lý thành công (`SUCCESS`).
- **Bảo mật môi trường:** Backend chỉ đọc header `X-Mock-Outcome` khi biến môi trường `NODE_ENV !== 'production'`. Trong môi trường `production`, header này luôn bị bỏ qua và giao dịch được coi là thành công.

| Header `X-Mock-Outcome` | Môi trường | Kết quả trả về | Hành vi hệ thống |
|---|---|---|---|
| `SUCCESS` (hoặc không truyền) | `development` / `test` | `status: SUCCESS`, `transactionRef: "MOCK_TXN_..."` | Payment → `SUCCESS`, Order → `PAID` |
| `FAILED` | `development` / `test` | `status: FAILED`, `failureReason: "Giao dịch bị từ chối bởi cổng thanh toán mô phỏng"` | Payment → `FAILED`, Order → `PAYMENT_FAILED` |
| Bất kỳ giá trị nào | `production` | Luôn bỏ qua header, xử lý thành công | Payment → `SUCCESS`, Order → `PAID` |

## 7. Lưu ý tích hợp Frontend & Backend

- Frontend hiển thị `amount` lấy từ đơn hàng, nhưng khi submit `POST /api/v1/payments` không gửi trường `amount` trong body. Backend tự trích xuất `finalAmount` từ Order.
- Frontend chịu trách nhiệm tự sinh UUID/CUID cho header `Idempotency-Key` mỗi lần gửi yêu cầu (và sinh key mới khi retry).
- **Công tắc mô phỏng trên UI:** Màn hình thanh toán Frontend có công tắc "Mô phỏng: Thành công / Thất bại". Công tắc này chỉ hiển thị khi `NEXT_PUBLIC_DEMO_MODE=true` (khai báo trong `.env.example`). Khi bật công tắc thất bại, Frontend gửi kèm header `X-Mock-Outcome: FAILED`.
- **Duy trì giỏ hàng:** Khi thanh toán thất bại hoặc gặp lỗi 401, Frontend giữ nguyên giỏ hàng để khách hàng có thể thử lại hoặc đăng nhập. Chỉ gọi `clearCart()` và xóa `pendingOrderId` khi nhận kết quả `SUCCESS`.
- Đối với VNPay, Backend tạo URL thanh toán và trả về cho Frontend. Frontend sử dụng URL này để chuyển người dùng đến trang thanh toán VNPay.
- Việc tạo URL VNPay thành công không đồng nghĩa với giao dịch đã thanh toán thành công. Kết quả giao dịch phải được xác nhận thông qua IPN.

## 8. VNPay IPN Contract

### 8.1. Endpoint

- **Method:** `GET`
- **URL:** `/api/v1/payments/vnpay/ipn`
- **Content-Type:** `application/json` (response)
- **Authentication:** Không sử dụng Bearer Token của người dùng. VNPay gọi endpoint này để thông báo kết quả giao dịch.
- **Request format:** Query Parameters.
- **Mục đích:** Tiếp nhận và xác nhận kết quả thanh toán từ VNPay, sau đó cập nhật trạng thái Payment và Order tương ứng.

### 8.2. Query Parameters

VNPay gửi thông tin giao dịch thông qua các query parameters. Các trường quan trọng được Backend sử dụng gồm:

| Query parameter | Bắt buộc | Ý nghĩa |
|---|---|---|
| `vnp_TxnRef` | Có | Mã tham chiếu giao dịch do hệ thống tạo, dùng tìm Payment tương ứng. |
| `vnp_Amount` | Có | Số tiền giao dịch theo đơn vị quy đổi của VNPay (thông thường bằng số tiền VND nhân 100). |
| `vnp_ResponseCode` | Có | Mã phản hồi kết quả giao dịch từ VNPay. |
| `vnp_TransactionStatus` | Có | Trạng thái giao dịch do VNPay cung cấp. |
| `vnp_TransactionNo` | Không | Mã giao dịch do VNPay cấp; được lưu vào `Payment.gatewayTransactionNo` khi có giá trị. |
| `vnp_TmnCode` | Theo dữ liệu ký | Mã website/merchant được VNPay cấp. |
| `vnp_BankCode` | Không | Mã ngân hàng thực hiện giao dịch. |
| `vnp_BankTranNo` | Không | Mã giao dịch tại ngân hàng. |
| `vnp_CardType` | Không | Loại thẻ hoặc phương thức thanh toán. |
| `vnp_OrderInfo` | Không | Thông tin đơn hàng được gửi khi tạo giao dịch. |
| `vnp_PayDate` | Không | Thời điểm thanh toán theo định dạng VNPay. |
| `vnp_SecureHash` | Có | Chữ ký dùng để xác thực dữ liệu VNPay gửi về. |
| `vnp_SecureHashType` | Tùy phiên bản | Thông tin loại chữ ký nếu được VNPay gửi kèm. |

Các query parameters bổ sung do VNPay gửi phải được giữ nguyên trong quá trình kiểm tra chữ ký theo quy tắc ký của VNPay. Không tự ý loại bỏ hoặc thay đổi dữ liệu trước khi xác thực.

### 8.3. Cơ chế xác thực chữ ký HMAC SHA512

Backend phải xác thực chữ ký trước khi cập nhật trạng thái Payment hoặc Order.

Quy trình xử lý:

1. Tiếp nhận query parameters từ VNPay.
2. Lấy `vnp_SecureHash` từ request.
3. Tạo chuỗi dữ liệu kiểm tra chữ ký theo quy tắc chuẩn của VNPay.
4. Sử dụng secret key được cấu hình trong môi trường Backend để tính chữ ký HMAC SHA512.
5. So sánh chữ ký tính được với `vnp_SecureHash` nhận từ VNPay.
6. Chỉ tiếp tục xử lý giao dịch nếu chữ ký hợp lệ.

Các yêu cầu bảo mật:

- Secret key VNPay phải được lưu trong biến môi trường Backend, không được đưa vào Frontend hoặc commit lên Git.
- Không tin cậy các query parameters trước khi xác thực chữ ký.
- Không cập nhật `Payment.status`, `Order.status` hoặc cộng Loyalty khi chữ ký không hợp lệ.
- Không sử dụng riêng `vnp_ResponseCode` để kết luận giao dịch hợp lệ nếu chữ ký chưa được xác thực.

### 8.4. Quy trình xử lý IPN

Sau khi xác thực chữ ký thành công, Backend thực hiện:

1. Kiểm tra các dữ liệu bắt buộc như `vnp_TxnRef`, `vnp_Amount`, `vnp_ResponseCode` và `vnp_TransactionStatus`.
2. Kiểm tra định dạng và giá trị số tiền giao dịch.
3. Tìm Payment theo `transactionRef` và gateway `VNPAY`.
4. Kiểm tra số tiền VNPay gửi về có khớp với số tiền Payment lưu trong database sau khi quy đổi đơn vị hay không.
5. Kiểm tra Payment hiện tại có đang ở trạng thái `PENDING` hay không.
6. Cập nhật Payment sang `SUCCESS` hoặc `FAILED` dựa trên kết quả giao dịch đã xác thực.
7. Cập nhật Order thông qua `OrderService.transition()`:
   - Thành công: Order chuyển sang `PAID`.
   - Thất bại: Order chuyển sang `PAYMENT_FAILED`.
8. Chỉ gọi `LoyaltyService.award()` khi giao dịch thành công và đảm bảo không cộng điểm trùng.

Nếu Payment đã được xử lý trước đó, Backend không được cập nhật trạng thái hoặc cộng điểm thưởng lần thứ hai.

### 8.5. Response JSON

VNPay IPN yêu cầu Backend trả về JSON có hai trường `RspCode` và `Message`.

Response IPN là response riêng theo giao thức VNPay, không sử dụng cấu trúc bọc `TransformInterceptor` của API dành cho Frontend.

| RspCode | Message | Ý nghĩa |
|---|---|---|
| `00` | `Confirm Success` | Giao dịch đã được tiếp nhận và xử lý thành công, bao gồm trường hợp giao dịch thất bại đã được ghi nhận đúng. |
| `01` | `Order not found` | Không tìm thấy Payment tương ứng với mã tham chiếu giao dịch. |
| `02` | `Order already confirmed` | Payment đã được xử lý trước đó hoặc không còn ở trạng thái chờ xử lý. |
| `04` | `Invalid amount` | Số tiền giao dịch không khớp với số tiền Payment trong hệ thống. |
| `97` | `Invalid signature` | Chữ ký VNPay không hợp lệ. |
| `99` | `Unknown error` | Dữ liệu không hợp lệ hoặc xảy ra lỗi xử lý không thuộc các trường hợp cụ thể khác. |

**Ví dụ response khi xác nhận thành công:**

```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

**Ví dụ response khi chữ ký không hợp lệ:**

```json
{
  "RspCode": "97",
  "Message": "Invalid signature"
}
```

**Ví dụ response khi giao dịch đã được xử lý:**

```json
{
  "RspCode": "02",
  "Message": "Order already confirmed"
}
```

Các giá trị `RspCode` và `Message` cần thống nhất với implementation thực tế của `PaymentsService.handleVnpayIpn()`.

### 8.6. Nguyên tắc chống xử lý IPN trùng

- Chỉ Payment có gateway `VNPAY` mới được xử lý bằng VNPay IPN.
- `vnp_TxnRef` phải được đối chiếu với `Payment.transactionRef`.
- Chỉ xử lý cập nhật khi Payment đang ở trạng thái `PENDING`.
- Việc cập nhật Payment cần có điều kiện trạng thái để tránh hai request IPN đồng thời cùng xử lý một giao dịch.
- Nếu một request IPN khác đã cập nhật Payment trước đó, request tiếp theo phải trả mã phản hồi tương ứng với giao dịch đã được xác nhận (`02`).
- Không cộng Loyalty hai lần cho cùng một giao dịch.
- Không thực hiện thay đổi tồn kho nguyên liệu trong riêng luồng xác nhận Payment.

### 8.7. IPN khi Order không còn ở trạng thái `PENDING`

Khách có thể hủy đơn, hoặc một Payment khác đã làm Order thành `PAID`, trong lúc vẫn đang ở trang VNPay. Khi IPN hợp lệ đến mà `Order.status != PENDING` (ví dụ `CANCELLED`, `PAID`, `PAYMENT_FAILED`):

- Payment vẫn được cập nhật theo kết quả VNPay (`SUCCESS` hoặc `FAILED`), có điều kiện `status = PENDING`.
- Nếu VNPay báo thành công, `failureReason` ghi `"Cần hoàn tiền thủ công: đơn đang ở trạng thái <status>"` để quản trị viên hoàn tiền.
- Backend **không** gọi `OrderService.transition()`, **không** cộng Loyalty và **không** thay đổi `Ingredient.stock` (tồn kho đã được hoàn khi hủy đơn).
- Backend ghi log cảnh báo và trả `{ "RspCode": "00", "Message": "Confirm Success" }` để VNPay ngừng gửi lại IPN.

### 8.8. Endpoint hỗ trợ sandbox

- `GET /api/v1/payments/vnpay/tunnel-info` (không cần đăng nhập): trả `tunnelUrl` (nếu tunnel đang chạy) và thông tin sandbox công khai (`tmnCode`, `paymentUrl`, `returnUrl`) để hiển thị hướng dẫn cấu hình IPN. Không bao giờ trả `vnp_HashSecret`.

### 8.9. Trang return và cơ chế dự phòng

- `VNPAY_RETURN_URL` trỏ tới `/payment/vnpay-return` của Frontend. Trang này lấy `vnp_TxnRef` (= `Payment.id`) và đọc trạng thái bằng `GET /payments/:id`, poll tối đa 10 lần khi còn `PENDING`.
- Nếu URL có `vnp_SecureHash`, trang return gọi thêm `GET /payments/vnpay/ipn` với đúng query đó làm dự phòng khi IPN chưa tới (ví dụ chạy local không có tunnel). Backend vẫn xác thực chữ ký và xử lý idempotent, nên gọi trùng với IPN thật là an toàn.
- Frontend không tự quyết định thanh toán thành công dựa trên `vnp_ResponseCode`; chỉ hiển thị trạng thái do Backend trả về.

## 9. Lịch sử thay đổi

- v1.0 (2026-10-11): Khởi tạo tài liệu hợp đồng API Payment.
- v1.1 (2026-10-16): Áp dụng quyết định D1, D2, D8.
- v1.2 (2026-10-31): Bổ sung đặc tả endpoint VNPay IPN, query parameters, cơ chế xác thực chữ ký HMAC SHA512, response JSON `RspCode`/`Message` và quy tắc chống xử lý IPN trùng.
- v1.3 (2026-11-01): Bổ sung mục 5.1 (TTL 15 phút của link VNPay, tái sử dụng payment `PENDING`), 8.7 (IPN khi Order không `PENDING`), 8.8 (tunnel-info), 8.9 (trang return và fallback).
