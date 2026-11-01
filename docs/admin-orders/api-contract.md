# API Contract: Admin Orders

> **Feature:** Admin xử lý đơn hàng (CR-QHUY) | **Owner:** Quang Huy | **Version:** v1.0 (aligned with D4, D6, D16, D17)

> **Lưu ý:** Đây là nguồn sự thật cho BE, FE và agent. Muốn đổi contract phải báo Chiến trước (Quy tắc #2).

---

## 0. Phạm vi

Màn hình quản trị đơn giản để **ADMIN** nhìn thấy đơn khách đã thanh toán và đưa đơn đi qua các bước pha chế → giao khách.

- Chỉ role `ADMIN` (D16, D17). `BARISTA` không dùng ở đợt này.
- Chỉ xử lý đơn đã thanh toán: `PAID`, `PREPARING`, `READY`.
- **Không** hủy đơn, hoàn tiền, sửa đơn, xem giá/tiền ở màn này.
- Mọi thay đổi `Order.status` **chỉ** đi qua `OrderService.transition()` (Quy tắc #3).
- Không WebSocket: FE tự refresh (polling) mỗi 10 giây.

Base URL: `/api/v1`. Mọi response được bọc bởi `TransformInterceptor`, lỗi theo `AllExceptionsFilter`.

---

## 1. Auth & phân quyền

| Mục | Nội dung |
|---|---|
| Header | `Authorization: Bearer <JWT>` |
| Guard | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` ở cấp controller |
| Không có / hết hạn token | `401 Unauthorized` |
| Token hợp lệ nhưng role khác `ADMIN` | `403 Forbidden` |

---

## 2. GET /admin/orders — Danh sách đơn cần xử lý

| Mục | Nội dung |
|---|---|
| Endpoint | `GET /api/v1/admin/orders` |
| Query | Không có |
| Điều kiện lọc | `status IN (PAID, PREPARING, READY)` |
| Sắp xếp | `paidAt` tăng dần, rồi `createdAt` tăng dần (đơn cũ nhất lên đầu, FIFO) |
| Giới hạn | Tối đa 100 đơn (đủ cho đồ án, không phân trang) |

### Response 200 OK

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "cmv5t0qeq0000mq6wzi4wzbl2",
      "orderNumber": 1042,
      "status": "PAID",
      "paidAt": "2026-10-30T03:15:22.000Z",
      "customerName": "Nguyễn Văn A",
      "items": [
        {
          "productName": "Cà phê Americano",
          "size": "M",
          "quantity": 2,
          "toppings": ["Kem Cheese", "Trân châu"]
        }
      ]
    }
  ],
  "timestamp": "2026-10-30T03:16:00.000Z"
}
```

Không có đơn nào → `data: []` (không phải lỗi).

### Quy tắc dữ liệu trả về

| Trường | Nguồn | Ghi chú |
|---|---|---|
| `id` | `Order.id` | Dùng cho `advance` |
| `orderNumber` | `Order.orderNumber` | FE hiển thị `#1042` |
| `status` | `Order.status` | Một trong `PAID`, `PREPARING`, `READY` |
| `paidAt` | `Order.paidAt` | ISO 8601; FE tính "x phút trước" |
| `customerName` | `User.fullName` | Nếu `null` hoặc rỗng → `"Khách"` |
| `items[].productName` | `Product.name` | |
| `items[].size` | `OrderItem.size` | `S`, `M`, `L` |
| `items[].quantity` | `OrderItem.quantity` | |
| `items[].toppings` | `Topping.name` của từng `OrderItemTopping` | Mảng tên, có thể rỗng `[]` |

**KHÔNG trả:** `userId`, email, `unitPrice`, `lineTotal`, `totalAmount`, `finalAmount`, `discountAmount`, điểm thưởng, thông tin thanh toán.

---

## 3. PATCH /admin/orders/:id/advance — Tiến đơn lên 1 bước

| Mục | Nội dung |
|---|---|
| Endpoint | `PATCH /api/v1/admin/orders/:id/advance` |
| Content-Type | `application/json` |
| Mô tả | Server tự tính trạng thái kế tiếp, **client không chọn trạng thái đích**. Client chỉ gửi `expectedStatus` (trạng thái admin đang nhìn thấy trên màn hình) để chống bấm trùng / 2 admin cùng bấm làm đơn bị nhảy 2 bước. |

### Request body

```json
{ "expectedStatus": "PAID" }
```

| Trường | Kiểu | Bắt buộc | Quy tắc |
|---|---|:---:|---|
| `expectedStatus` | String | Có | Một trong `PAID`, `PREPARING`, `READY` (`@IsIn`). Trường lạ trong body bị từ chối (`forbidNonWhitelisted`). |

### Bảng chuyển trạng thái (server tính)

| Trạng thái hiện tại | Trạng thái kế tiếp | Tab FE | Nhãn nút FE |
|---|---|---|---|
| `PAID` | `PREPARING` | Chờ pha | Bắt đầu pha |
| `PREPARING` | `READY` | Đang pha | Pha xong |
| `READY` | `COMPLETED` | Chờ giao | Đã giao khách |

Các chuyển tiếp trên đều nằm trong 9 chuyển tiếp hợp lệ của state machine (`order-state.ts`). Đơn `COMPLETED` không đi tiếp nên biến mất khỏi danh sách ở lần refresh sau.

### Quy trình phía server (một `$transaction`)

1. Đọc `status` hiện tại của đơn trong transaction. Không có đơn → `404`.
2. Nếu `status !== expectedStatus` → `409` (đã có người đổi trạng thái).
3. Nếu `status` không có bước kế tiếp (`PENDING`, `PAYMENT_FAILED`, `COMPLETED`, `CANCELLED`) → `409`.
4. Gọi `OrderService.transition(tx, id, next, { changedBy: 'admin' })`. Hàm này cập nhật có điều kiện theo `version` và ghi `OrderStatusHistory`. Va chạm version → `409`.

### Response 200 OK

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "cmv5t0qeq0000mq6wzi4wzbl2",
    "orderNumber": 1042,
    "fromStatus": "PAID",
    "status": "PREPARING"
  },
  "timestamp": "2026-10-30T03:17:05.000Z"
}
```

### Lỗi

Định dạng lỗi chung của hệ thống:

```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Đơn hàng đã được cập nhật bởi người khác. Vui lòng tải lại danh sách.",
  "timestamp": "2026-10-30T03:17:06.000Z",
  "path": "/api/v1/admin/orders/cmv5t0qeq0000mq6wzi4wzbl2/advance"
}
```

| HTTP | Khi nào |
|---|---|
| 400 | `expectedStatus` thiếu / không thuộc `PAID`, `PREPARING`, `READY`; body có trường lạ |
| 401 | Thiếu hoặc hết hạn token |
| 403 | Không phải `ADMIN` |
| 404 | Không có đơn với `id` này |
| 409 | `status` hiện tại khác `expectedStatus`; đơn ở trạng thái không thể tiến thêm; xung đột version khi chuyển trạng thái |

---

## 4. Hợp đồng FE

### 4.1 Trang `/admin` (thay trang placeholder của CR-ROLE)

- Giữ guard: `useRequireAuth(['ADMIN'])`. Không phải `ADMIN` thì chuyển hướng như hiện tại.
- Gọi `GET /admin/orders` khi vào trang, rồi lặp lại mỗi 10 giây và khi bấm nút "Làm mới". Dừng polling khi rời trang.
- Chia danh sách thành 3 tab theo `status` ở phía FE: **Chờ pha** (`PAID`), **Đang pha** (`PREPARING`), **Chờ giao** (`READY`). Mỗi tab hiển thị số lượng đơn.
- Mỗi card: `#orderNumber`, `customerName`, "x phút trước" (từ `paidAt`), danh sách món (`productName`, size, `× quantity`, toppings).
- Mỗi card có **1 nút** theo bảng ở mục 3. Khi bấm: gửi `PATCH` với `expectedStatus` = `status` của card đó.
  - Đang gọi API: khóa nút và hiện trạng thái loading.
  - `200`: cập nhật lại danh sách (đơn chuyển tab hoặc biến mất).
  - `409`: hiện thông báo ngắn "Đơn đã được cập nhật, đang tải lại" rồi tải lại danh sách.
  - Lỗi khác: hiện thông báo lỗi, giữ nguyên danh sách.
- Có đủ 3 trạng thái: loading (skeleton), empty ("Chưa có đơn cần xử lý"), error (kèm nút thử lại).
- Dùng tốt ở 375px (mobile-first). Ẩn `BottomNav` khách hàng ở `/admin` nếu AppShell đang hiển thị.

### 4.2 Trang khách `/orders/[id]`

- Khi `status` của đơn là `PAID`, `PREPARING` hoặc `READY`: tự gọi lại API chi tiết đơn mỗi 10 giây.
- Khi `COMPLETED`, `CANCELLED` hoặc `PAYMENT_FAILED`: dừng polling.
- Nhãn tiếng Việt dùng lại bộ 7 nhãn trạng thái hiện có.

---

## 5. Thử nhanh bằng curl

```bash
# Đăng nhập ADMIN (tài khoản seed của CR-LAN), lấy accessToken
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}' | jq -r '.data.accessToken')

# Danh sách đơn cần xử lý
curl -s http://localhost:4000/api/v1/admin/orders -H "Authorization: Bearer $TOKEN"

# Tiến 1 bước (PAID -> PREPARING)
curl -s -X PATCH http://localhost:4000/api/v1/admin/orders/<orderId>/advance \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"expectedStatus":"PAID"}'

# Gửi lại đúng request trên lần nữa -> 409 (đơn đã sang PREPARING)
```

Token của user `CUSTOMER` gọi 2 endpoint trên phải nhận `403`.

---

## 6. Kịch bản kiểm tra tay (dùng cho file `.http` và nghiệm thu)

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | ADMIN gọi `GET /admin/orders` khi có đơn `PAID` | 200, đủ tên khách + món + topping, không có giá |
| 2 | CUSTOMER gọi `GET /admin/orders` | 403 |
| 3 | Không có token | 401 |
| 4 | `advance` với `expectedStatus: PAID` trên đơn `PAID` | 200, `PREPARING` |
| 5 | Lặp lại request 4 | 409, đơn vẫn `PREPARING` (không nhảy sang `READY`) |
| 6 | `advance` lần lượt `PREPARING` rồi `READY` | `READY` rồi `COMPLETED`; đơn biến mất khỏi danh sách |
| 7 | `advance` đơn `PENDING` / `CANCELLED` | 409 |
| 8 | `advance` với id không tồn tại | 404 |
| 9 | `advance` thiếu hoặc sai `expectedStatus` | 400 |
| 10 | Mỗi lần `advance` thành công | Có 1 dòng mới trong `order_status_history` với `changedBy = 'admin'` |

---

## 7. Cấu trúc file

```
backend/src/modules/admin-orders/
  admin-orders.module.ts       # imports: [OrdersModule] (đã export OrderService)
  admin-orders.controller.ts   # @Controller('admin/orders') + JwtAuthGuard + RolesGuard + @Roles(ADMIN)
  admin-orders.service.ts      # inject PrismaService (global) + OrderService
  dto/advance-order.dto.ts     # expectedStatus
backend/requests/admin-orders.http
frontend/src/app/admin/page.tsx
frontend/src/services/admin-order.service.ts
frontend/src/app/orders/[id]/**    # polling mục 4.2
```

`AdminOrdersModule` được Chiến đăng ký sẵn trong `app.module.ts`; Quang Huy không sửa file này.
