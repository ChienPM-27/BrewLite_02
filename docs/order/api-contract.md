# API Contract: Order

> **Feature:** Order | **Owner:** Tôn Thất Hạnh | **Version:** v1.1 (Official Contract aligned with Design Decisions D1–D9)

## 1. POST /orders — Tạo đơn hàng

|     Mục      |                                  Nội dung                                   |
|--------------|-----------------------------------------------------------------------------|
|    Mô tả     | Tạo đơn hàng mới với trạng thái ban đầu `PENDING`, xác thực JWT, kiểm tra tồn kho và trừ kho (Optimistic Lock cho Product, có điều kiện cho Topping), tính toán giá server-side và áp dụng mã khuyến mãi trong transaction. |
|     Auth     | **Bắt buộc JWT** (`Authorization: Bearer <JWT>`). Backend trích xuất `userId` từ token (`req.user.sub`), tuyệt đối không nhận `userId` từ request body nhằm bảo đảm an toàn danh tính (D4). |
| Content-Type | `application/json` |
|   Endpoint   | `POST /api/v1/orders` |

### Request body

Cấu trúc request chuẩn gửi từ Client/Giỏ hàng:

```json
{
  "items": [
    {
      "productId": "cmv19kpye000794rc6vgebmpz",
      "size": "M",
      "quantity": 2,
      "toppingIds": [
        "cmv19kq1a000f94rc408018h2"
      ]
    }
  ],
  "promotionCode": "GIAM15K"
}
```

### Giải thích các trường

|    Trường    |      Kiểu dữ liệu    | Bắt buộc |              Ý nghĩa                |
|--------------|----------------------|:--------:|-------------------------------------|
|   `items`    |        Array         | Có       | Danh sách mặt hàng trong đơn        |
|  `productId` |        String        | Có       | ID sản phẩm (CUID)                  |
|    `size`    |        String        | Không    | Kích cỡ sản phẩm: `S`, `M` hoặc `L` (mặc định `M`) |
|  `quantity`  |        Number        | Có       | Số lượng sản phẩm mỗi dòng: từ `1` đến `99` (D5) |
| `toppingIds` |    Array of String   | Không    | Danh sách ID topping (không trùng lặp, mặc định `[]`) |
| `promotionCode` |     String         | Không    | Mã khuyến mãi tùy chọn (D7)         |

**Quy tắc:** Giá sản phẩm, giá topping, tổng tiền và trạng thái đơn hàng do backend xác định. Client không được tự gửi giá cuối cùng hoặc trạng thái đơn để quyết định kết quả tạo đơn.

### Quy tắc kiểm tra dữ liệu đầu vào (DTO Validation)

| Trường | Kiểu dữ liệu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `items` | Array | Có | Danh sách mặt hàng không được rỗng (`@ArrayNotEmpty()`). |
| `items[].productId` | String | Có | ID sản phẩm tồn tại và khả dụng (`isAvailable = true`). |
| `items[].size` | String | Không | Kích cỡ hợp lệ thuộc enum `ProductSize`: `S`, `M` hoặc `L`. |
| `items[].quantity` | Number | Có | Số nguyên từ `1` đến `99` (`@IsInt()`, `@Min(1)`, `@Max(99)`). |
| `items[].toppingIds` | Array of String | Không | Danh sách ID topping; không chấp nhận ID trùng lặp (`@ArrayUnique()`) và topping phải khả dụng, còn tồn kho. |
| `promotionCode` | String | Không | Mã chuỗi nếu có (`@IsOptional()`, `@IsString()`). |

### Công thức tính giá phía Server:
- `unitPrice = basePrice + sizeAdjustment` (Size S: +0đ, Size M: +5.000đ, Size L: +10.000đ theo seed).
- `lineTotal = (unitPrice + Σ toppingPrice) × quantity`.
- `totalAmount = Σ lineTotal`.
- `discountAmount`: do `PromotionsService.validate(promotionCode, totalAmount)` tính toán (mã hợp lệ, còn hạn, đạt minOrderAmount).
- `finalAmount = Math.max(0, totalAmount - discountAmount)`.

### Response 201 Created

Response mẫu bọc tự động qua `TransformInterceptor` (Ví dụ: Americano basePrice 40.000 + size M 5.000 = unitPrice 45.000; topping Kem Cheese 10.000; quantity 2; lineTotal = (45.000 + 10.000) * 2 = 110.000):

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "cmv5t0qeq0000mq6wzi4wzbl2",
    "orderNumber": 1042,
    "userId": "cmv5p022t0000mq44nt7fyszo",
    "status": "PENDING",
    "totalAmount": 110000,
    "discountAmount": 0,
    "finalAmount": 110000,
    "items": [
      {
        "productId": "cmv19kpye000794rc6vgebmpz",
        "size": "M",
        "quantity": 2,
        "unitPrice": 45000,
        "lineTotal": 110000,
        "toppings": [
          {
            "toppingId": "cmv19kq1a000f94rc408018h2",
            "price": 10000
          }
        ]
      }
    ],
    "payments": [],
    "statusHistory": [
      {
        "fromStatus": null,
        "toStatus": "PENDING",
        "changedBy": "system",
        "reason": "Order created"
      }
    ]
  },
  "timestamp": "2026-10-16T10:00:00.000Z"
}
```

### Các mã lỗi của POST /orders

| HTTP Status | Trường hợp | Ghi chú |
|---|---|---|
| `400 Bad Request` | Dữ liệu không hợp lệ, số lượng ngoài `1..99`, sản phẩm/topping hết hàng hoặc ngưng bán, mã khuyến mãi không hợp lệ | Trả thông báo lỗi rõ ràng. Với lỗi hết hàng: trả `400 Bad Request` (khớp tiêu chuẩn TS-E2E-STOCK-01). |
| `401 Unauthorized` | Thiếu Bearer Token JWT hoặc token hết hạn | Trả về `401 Unauthorized`. |
| `500 Internal Server Error` | Lỗi máy chủ không mong muốn | Được bọc qua `AllExceptionsFilter`. |

---

## 2. POST /orders/:id/cancel — Khách hàng hủy đơn hàng (D6)

|     Mục      |                                  Nội dung                                   |
|--------------|-----------------------------------------------------------------------------|
|    Mô tả     | Khách hàng chủ động hủy đơn hàng đang chờ xử lý (`PENDING` hoặc `PAYMENT_FAILED`). Hoàn lại tồn kho cho Product và Topping trong cùng transaction. |
|     Auth     | **Bắt buộc JWT** (`Authorization: Bearer <JWT>`). Chỉ chủ sở hữu đơn hàng mới có quyền hủy đơn. |
|   Endpoint   | `POST /api/v1/orders/:id/cancel` |

### Quy tắc xử lý nghiệp vụ:
1. Trích xuất `userId` từ `req.user.sub`.
2. Tìm kiếm đơn hàng theo `id`. Nếu đơn hàng không tồn tại hoặc `order.userId !== userId`: ném lỗi `404 Not Found` (để bảo mật dữ liệu, không làm lộ sự tồn tại của đơn hàng thuộc người khác).
3. Kiểm tra trạng thái đơn hàng: Chỉ cho phép hủy khi trạng thái hiện tại là `PENDING` hoặc `PAYMENT_FAILED`. Nếu đơn ở trạng thái khác (`PAID`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`): ném lỗi `409 Conflict`.
4. Thực thi trong transaction:
   - Chuyển trạng thái sang `CANCELLED` qua `OrderService.transition`.
   - Hoàn trả số lượng tồn kho cho các sản phẩm (`Product.stock = Product.stock + quantity`, tăng `Product.version`).
   - Hoàn trả số lượng tồn kho cho các toppings tương ứng (`Topping.stock = Topping.stock + 1`).
   - Ghi nhận bản ghi `OrderStatusHistory` với `toStatus = CANCELLED`, `reason = "Customer cancelled"`.

### Response 200 OK
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "cmv5t0qeq0000mq6wzi4wzbl2",
    "orderNumber": 1042,
    "status": "CANCELLED"
  },
  "timestamp": "2026-10-16T10:05:00.000Z"
}
```

---

## 3. Quản lý Tồn kho & Optimistic Locking (D3)

Việc trừ và hoàn tồn kho khi đặt/hủy đơn được thực hiện trong cùng Prisma transaction (`$transaction`):
- **Sản phẩm (Product):** Sử dụng **Optimistic Locking** thông qua trường `version`:
  ```ts
  const updated = await prisma.product.updateMany({
    where: {
      id: item.productId,
      version: currentVersion,
      stock: { gte: item.quantity },
    },
    data: {
      stock: { decrement: item.quantity },
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    throw new BadRequestException(`Sản phẩm ${item.productId} không đủ tồn kho hoặc có xung đột`);
  }
  ```
- **Topping:** Sử dụng cập nhật có điều kiện `stock >= qty` (do model `Topping` không có trường version):
  ```ts
  const updatedTopping = await prisma.topping.updateMany({
    where: {
      id: toppingId,
      stock: { gte: 1 },
    },
    data: {
      stock: { decrement: 1 },
    },
  });
  if (updatedTopping.count === 0) {
    throw new BadRequestException(`Topping ${toppingId} đã hết hàng`);
  }
  ```

---

## 4. `assertTransition` & State Machine Rules (D6)

Đảm bảo đúng 10 chuyển tiếp trạng thái theo đề bài PDF:

```ts
export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED, // Giữ ở mức State Machine/Service theo PDF, ngoài scope MVP
  ],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictException(`Invalid order transition: ${from} -> ${to}`);
  }
}
```

---

## 5. Điểm cần xử lý (Open Item)

- **Lệch schema tại `OrderStatusHistory.fromStatus`:**
  - Trong `schema.prisma`, trường `fromStatus OrderStatus` là bắt buộc (không nullable).
  - Tuy nhiên, khi tạo đơn hàng mới (`(start) → PENDING`), trạng thái ban đầu chưa có trạng thái trước (`fromStatus: null`).
  - **Đề xuất giải pháp:** Giữ nguyên schema hiện tại trong tài liệu này; Backend Owner sẽ tạo một migration riêng để sửa trường này thành nullable (`fromStatus OrderStatus?`). Không sửa schema trong nhánh tài liệu.

## 6. Lịch sử thay đổi
- v1.0 (2026-10-13): Khởi tạo tài liệu API Contract Order.
- v1.1 – áp dụng quyết định D1, D3, D4, D5, D6, D7 (ngày 2026-10-16).

