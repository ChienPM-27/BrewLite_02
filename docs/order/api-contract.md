# API Contract: Order

> **Feature:** Order | **Owner:** Tôn Thất Hạnh | **Version:** v1 (draft)

> **Lưu ý:** Hợp đồng API được xây dựng dựa trên backend hiện tại. Những chức năng chưa xác minh hoặc chưa triển khai sẽ được ghi rõ là dự kiến, không xem như chức năng đã hoàn thành.

## 1. POST /orders — Tạo đơn hàng

|     Mục      |                                  Nội dung                                   |
|--------------|-----------------------------------------------------------------------------|
|    Mô tả     | Tạo đơn hàng mới với trạng thái ban đầu `PENDING`, kiểm tra dữ liệu đặt hàng, xác minh sản phẩm và topping, kiểm tra và cập nhật tồn kho trong transaction. |
|     Auth     | **Bắt buộc JWT** (`Authorization: Bearer <JWT>`). Backend trích xuất `userId` từ token (`req.user.sub`), không nhận `userId` từ request body nhằm bảo đảm an toàn. |
| Content-Type | `application/json` |
|   Endpoint   | `POST /api/v1/orders` |

### Request body

Cấu trúc request chuẩn gửi từ Client/Giỏ hàng:

```json
{
  "items": [
    {
      "productId": "cmv5p023c0007mq44py7r5lut",
      "size": "M",
      "quantity": 2,
      "toppingIds": [
        "cmv5p02340003mq449hok5wj6"
      ]
    }
  ]
}
```

### Giải thích các trường

|    Trường    |      Kiểu dữ liệu    |              Ý nghĩa                |
|--------------|----------------------|-------------------------------------|
|   `items`    |        Array         | Danh sách mặt hàng trong đơn        |
|  `productId` |        String        | ID sản phẩm (CUID)                  |
|    `size`    |        String        | Kích cỡ sản phẩm: `S`, `M` hoặc `L` (mặc định `M`) |
|  `quantity`  |        Number        | Số lượng sản phẩm (1..100)          |
| `toppingIds` |    Array of String   | Danh sách ID topping được chọn (không trùng lặp) |

**Quy tắc:** Giá sản phẩm, giá topping, tổng tiền và trạng thái đơn hàng do backend xác định. Client không được tự gửi giá cuối cùng hoặc trạng thái đơn để quyết định kết quả tạo đơn.

### Quy tắc kiểm tra dữ liệu đầu vào

| Trường | Kiểu dữ liệu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `items` | Array | Có | Danh sách mặt hàng không được rỗng (`@ArrayNotEmpty()`). |
| `items[].productId` | String | Có | ID sản phẩm tồn tại và khả dụng (`isAvailable = true`). |
| `items[].size` | String | Không | Kích cỡ hợp lệ thuộc enum `ProductSize`: `S`, `M` hoặc `L`. |
| `items[].quantity` | Number | Có | Số nguyên từ `1` đến `100` (`@IsInt()`, `@Min(1)`, `@Max(100)`). |
| `items[].toppingIds` | Array of String | Không | Danh sách ID topping; không chấp nhận ID trùng lặp (`@ArrayUnique()`) và topping phải khả dụng. |

### Response 201 Created

Response mẫu bọc tự động qua `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "cmv5t0qeq0000mq6wzi4wzbl2",
    "orderNumber": 1042,
    "userId": "cmv5p022t0000mq44nt7fyszo",
    "status": "PENDING",
    "totalAmount": 90000,
    "discountAmount": 0,
    "finalAmount": 90000,
    "items": [
      {
        "productId": "cmv5p023c0007mq44py7r5lut",
        "size": "M",
        "quantity": 2,
        "unitPrice": 40000,
        "lineTotal": 90000
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
  "timestamp": "2026-10-13T00:00:00.000Z"
}
```

**Lưu ý:**
- Đây là ví dụ minh họa cấu trúc, không phải bản sao nguyên văn của một response hoàn chỉnh.
- Các giá trị tiền có thể được Prisma trả về dưới dạng chuỗi khi sử dụng kiểu Decimal.
- `timestamp` là giá trị minh họa; hãy giữ timestamp thực tế từ response nếu cần ví dụ chính xác.
- Các trường lồng nhau như `product`, `toppings`, `createdAt` có thể xuất hiện tùy theo dữ liệu và cấu hình trả về của service. Cần đối chiếu response Postman trước khi chốt JSON mẫu.

### Các mã lỗi

|        HTTP        |             Trường hợp           |                Ghi chú              |
|---------------------------------------------------------------------------------------------|
*| 400 Bad Request | Dữ liệu đầu vào không hợp lệ, số lượng không hợp lệ, kích cỡ không được hỗ trợ, không có mặt hàng hoặc sản phẩm/topping không đáp ứng điều kiện đặt hàng. | Backend Order hiện tại sử dụng `BadRequestException` cho các trường hợp validation nghiệp vụ. Thông báo cụ thể phụ thuộc vào lỗi phát sinh. |
*| 401 Unauthorized | Thiếu hoặc không hợp lệ thông tin xác thực. | Chỉ áp dụng khi cơ chế xác thực được tích hợp và yêu cầu xác thực được bật. Cần xác minh guard và cấu hình thực tế. |
*| 404 Not Found | Không tìm thấy đơn hàng hoặc tài nguyên được yêu cầu. | Controller hiện tại sử dụng `NotFoundException` khi không tìm thấy đơn hàng và khi tham số phân trang không hợp lệ. Trường hợp phân trang nên được đổi sang `400 Bad Request` để đúng ý nghĩa của lỗi. |
*| 409 Conflict | Xung đột trạng thái hoặc tài nguyên do yêu cầu đồng thời. | Chỉ ghi nhận nếu backend chủ động trả `ConflictException` hoặc ánh xạ lỗi tương ứng. Không mặc định mọi trường hợp hết hàng đều trả `409`. |
*| 500 Internal Server Error | Lỗi hệ thống ngoài dự kiến. | Chi tiết response phụ thuộc vào `AllExceptionsFilter` hoặc cơ chế xử lý ngoại lệ đang được cấu hình. Không trả thông tin nhạy cảm của hệ thống cho client. |

**Lưu ý về response lỗi**

Cấu trúc JSON lỗi chính thức cần được đối chiếu với `AllExceptionsFilter` và kết quả thực tế từ Postman. Không dùng một cấu trúc mẫu làm chuẩn cho tất cả mã HTTP khi chưa xác minh.

**Đề xuất cải tiến:** Với lỗi hết hàng, có thể bổ sung mã lỗi nghiệp vụ cùng thông tin mặt hàng bị thiếu, chẳng hạn `productId` và `available`, để frontend hiển thị thông báo phù hợp. Đây là đề xuất thiết kế, chưa được xem là chức năng đã triển khai.


## 2. Endpoint liên quan (draft, chốt chi tiết ở feature khác)

|    Endpoint    |    Thuộc feature    |      Liên quan đến Order      |     Trạng thái       |
|---------------------------------------------------------------------------------------------|
*| `POST /payments` (header `Idempotency-Key`) | Payment | Xử lý thanh toán cho đơn hàng; khi thanh toán thành công, đơn chuyển từ `PENDING` sang `PAID`; khi thất bại, xử lý trạng thái theo quy ước của feature Payment. | Draft — cần thống nhất với nhóm Payment |
*| `GET /orders/me` | History | Trả danh sách đơn hàng của người dùng hiện tại, dự kiến gồm `id`, `status`, tổng tiền, thời gian tạo và danh sách sản phẩm. | Draft — cần xác nhận cơ chế xác thực và phân quyền |
*| `POST /orders/:id/cancel` | Order | Yêu cầu hủy đơn hàng; trạng thái được phép hủy và cách xử lý tồn kho cần được thống nhất trong State Machine. | Draft — chưa xác nhận endpoint đã triển khai |

**Lưu ý:** Các endpoint trên là định hướng tích hợp giữa các feature, không mặc nhiên phản ánh API hiện có. Quy tắc chuyển trạng thái, mã HTTP khi chuyển trạng thái không hợp lệ và việc hoàn trả tồn kho phải thống nhất với Order State Machine và nhóm Payment trước khi chốt API contract.

## 3. Mapping dữ liệu → Order / OrderItem

> Mapping dưới đây dựa trên DTO và hành vi backend đã kiểm tra. Tên trường trong Prisma Schema cần được đối chiếu trước khi chốt tài liệu.

### 3.1. Mapping Order

|     Nguồn (request / hệ thống)     |     Đích    |               Ghi chú                     |
|---|---|---|
| `req.user.sub` (Bearer JWT) | `Order.userId` | Backend trích xuất từ JWT token qua `JwtAuthGuard`; không nhận từ client body. |
| (hệ thống) | `Order.status = PENDING` | Trạng thái ban đầu của đơn hàng. |
| (hệ thống sinh tự động) | `Order.orderNumber` | Mã số đơn hiển thị (Int, autoincrement). |
| (hệ thống) | `Order.createdAt` | Thời điểm tạo đơn, theo cơ chế quản lý thời gian của backend/database. |
| Tổng tiền các dòng hàng | `Order.totalAmount` | Backend tính giá phía server. |
| (hệ thống) | `Order.discountAmount` | Giá trị giảm giá; mặc định 0 nếu không có promotion. |
| Tổng tiền sau giảm giá | `Order.finalAmount` | Tổng tiền cuối cùng được lưu cho đơn hàng (= totalAmount - discountAmount). |

### 3.2. Mapping OrderItem

|     Nguồn (request / hệ thống)     |     Đích    |               Ghi chú                     |
|----------------------------------------------------------------------------------------------|
*| `items[].productId` | `OrderItem.productId` | ID sản phẩm. |
*| `items[].size` | `OrderItem.size` | Kích cỡ hợp lệ: `S`, `M`, `L`. |
*| `items[].quantity` | `OrderItem.quantity` | Số lượng đặt mua; backend kiểm tra giá trị hợp lệ. |
*| (hệ thống) | `OrderItem.orderId` | Khóa ngoại liên kết tới đơn hàng vừa tạo. |
*| Giá sản phẩm trong DB và phụ phí kích cỡ | `OrderItem.unitPrice` | Server tính giá, không tin giá do client gửi lên. |
*| Giá sản phẩm, phụ phí kích cỡ, topping và số lượng | `OrderItem.lineTotal` | Server tính tổng tiền dòng hàng theo công thức nghiệp vụ hiện tại. |
*| `items[].toppingIds` | Quan hệ topping của `OrderItem` | Backend nhận danh sách ID topping; cần đối chiếu Prisma Schema để ghi chính xác tên bảng hoặc quan hệ lưu trữ. |

### 3.3. Cập nhật tồn kho

|         Nguồn        |           Thao tác            |               Ghi chú               |
|--------------------------------------------------------------------------------------------|
*| `Product.stock` | Giảm tồn kho sản phẩm | Backend kiểm tra tồn kho và cập nhật trong transaction. |
*| Tồn kho topping | Giảm tồn kho topping được chọn | Cần bảo đảm việc cập nhật cùng transaction với thao tác tạo đơn hàng. |
*| Lỗi trong quá trình tạo đơn | Rollback transaction | Kiểm tra lại tồn kho và dữ liệu đơn hàng khi phát sinh lỗi để xác nhận rollback hoạt động đúng. |

**Quy tắc chung:** Giá tiền, trạng thái đơn hàng và kết quả kiểm tra tồn kho do backend quyết định. Không ghi các trường `expiresAt`, `subtotal`, `promoCode` hoặc `version` là trường đã triển khai nếu chưa xác nhận chúng tồn tại trong schema và logic backend.

## 4. Draft `assertTransition` (NestJS)

> Trạng thái: Draft — cần thống nhất với Order State Machine và nhóm Payment trước khi triển khai.

```ts
// order-state.ts
import { ConflictException } from '@nestjs/common';

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
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictException(
      `Invalid order transition: ${from} -> ${to}`,
    );
  }
}
```

### Cách sử dụng dự kiến

`OrderService.transition(orderId, to)` cần:

1. Đọc trạng thái hiện tại của đơn hàng.
2. Gọi `assertTransition(from, to)` để kiểm tra chuyển trạng thái.
3. Cập nhật trạng thái có điều kiện theo ID và trạng thái cũ.
4. Nếu không có bản ghi nào được cập nhật do trạng thái đã thay đổi đồng thời, trả về `409 Conflict`.
5. Ghi lịch sử thay đổi trạng thái trong cùng transaction nếu nghiệp vụ yêu cầu.

**Lưu ý:** Đây là code mẫu. Cần kiểm tra enum và tên trường trong Prisma Schema trước khi tích hợp. Quy tắc cho phép chuyển `PAID → CANCELLED` phải được xác nhận với nhóm vì có thể liên quan đến hoàn tiền.

## 5. Luồng xử lý `POST /orders` (tóm tắt cho Backend)

1. **Nhận request:** Controller nhận dữ liệu tạo đơn hàng theo `CreateOrderDto`, gồm `userId` và `items`.
2. **Kiểm tra dữ liệu:** Kiểm tra các trường bắt buộc, danh sách sản phẩm, `quantity`, `size` và danh sách `toppingIds`.
3. **Xác minh dữ liệu:** Kiểm tra người dùng, sản phẩm, topping, trạng thái khả dụng và tồn kho theo quy tắc nghiệp vụ.
4. **Tính tiền:** Backend lấy giá từ dữ liệu hệ thống, tính giá từng dòng hàng và tổng tiền đơn hàng. Không sử dụng giá do client tự gửi.
5. **Transaction:** Kiểm tra và cập nhật tồn kho sản phẩm, topping; tạo `Order`, `OrderItem` và lịch sử trạng thái ban đầu. Nếu có lỗi làm transaction thất bại, các thay đổi trong transaction phải được rollback.
6. **Trả response:** Trả HTTP `201 Created` khi tạo đơn thành công, theo response wrapper thực tế của backend.

### Các điểm cần xác nhận trước khi hoàn thiện

- **Xác thực:** Hiện chưa xác nhận `JwtAuthGuard` có được áp dụng cho endpoint hay không. Backend hiện nhận `userId` từ request body.
- **Khuyến mãi:** Chỉ bổ sung `promoCode` vào luồng khi DTO và nghiệp vụ khuyến mãi đã được thống nhất, triển khai.
- **Hạn thanh toán:** Chỉ thêm `expiresAt` nếu schema và quy tắc hết hạn thanh toán thực sự hỗ trợ.
- **Cập nhật tồn kho đồng thời:** Cần đối chiếu câu lệnh Prisma thực tế. Không mặc định có cột `version` hoặc cơ chế retry ba lần khi chưa xác nhận.
- **Mã lỗi:** Phải khớp với exception mà service thực sự ném ra và cách exception filter ánh xạ sang HTTP response.
