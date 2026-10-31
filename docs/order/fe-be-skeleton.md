# 🧱 BỘ KHUNG FE-BE SKELETON: ORDER MODULE

> **Feature:** Order (Tạo đơn hàng & Quản lý trạng thái)  
> **Tác giả:** Tôn Thất Hạnh  
> **Phiên bản:** v1.0 (Kiến trúc Tuần 1)  
> **Mục tiêu:** Cung cấp mã khung (Skeleton) chuẩn NestJS phía Backend và React/Next.js phía Frontend theo tiêu chuẩn quy ước chung của BrewLite, làm nền tảng triển khai cho Sprint 2.

---

## 1. PHÍA BACKEND (NESTJS)

### 1.1. Data Transfer Objects (DTO) kèm Validation

File tham khảo: `backend/src/modules/orders/dto/create-order.dto.ts`

```typescript
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ArrayNotEmpty,
  ArrayMaxSize,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductSize } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId: string;

  @IsOptional()
  @IsEnum(ProductSize, { message: 'size phải là S, M hoặc L' })
  size?: ProductSize = ProductSize.M;

  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(1, { message: 'quantity tối thiểu là 1' })
  @Max(99, { message: 'quantity tối đa là 99 cho mỗi dòng món' })
  quantity: number;

  @IsOptional()
  @IsArray({ message: 'toppingIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi toppingId phải là chuỗi' })
  @ArrayUnique({ message: 'Danh sách topping không được chứa ID trùng lặp' })
  @ArrayMaxSize(3, { message: 'Mỗi món chỉ được chọn tối đa 3 loại topping' })
  toppingIds?: string[] = [];
}

export class CreateOrderDto {
  @IsArray({ message: 'items phải là một mảng danh sách món' })
  @ArrayNotEmpty({ message: 'Đơn hàng phải có ít nhất một sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString({ message: 'Mã khuyến mãi phải là chuỗi ký tự' })
  promotionCode?: string;
}
```

---

### 1.2. Controller và API tạo đơn hàng

**File triển khai thực tế:** `backend/src/modules/orders/orders.module.ts`

Controller tạo đơn sử dụng `JwtAuthGuard` để xác thực người dùng. ID người dùng được lấy từ `req.user.sub`, do đó client không tự truyền `userId` trong body để xác định chủ đơn hàng.

Endpoint tạo đơn:

- **Method:** `POST`
- **Path:** `/api/v1/orders`
- **Authentication:** JWT Bearer Token
- **Success status:** HTTP 201 Created
- **Request body:** `CreateOrderDto`

Ví dụ minh họa phần controller tạo đơn (rút gọn; không đại diện cho toàn bộ nội dung file):

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(req.user.sub, dto);
  }
}
```
---

### 1.3. Service và quản lý trạng thái đơn hàng

Phần xử lý nghiệp vụ Order được tổ chức thành các thành phần riêng biệt:

**1. Tạo đơn hàng**

File triển khai: `backend/src/modules/orders/orders.service.ts`

`OrdersService.create()` thực hiện các bước chính:

- Kiểm tra danh tính người dùng, dữ liệu đơn hàng và các sản phẩm/topping được phép bán.
- Tính giá bằng `PricingService` và kiểm tra khuyến mãi bằng `PromotionsService`.
- Đọc công thức `ProductRecipe` theo `productId` và `size`, đồng thời đọc `ToppingRecipe` của các topping được chọn.
- Từ chối tạo đơn bằng HTTP 400 nếu món thiếu công thức theo D15. Topping thiếu công thức nguyên liệu cũng bị từ chối tạo đơn bằng HTTP 400 theo quy tắc nghiệp vụ đã thống nhất.
- Tính và gom nhu cầu nguyên liệu theo `ingredientId`, sau đó gọi `deductIngredients(tx, needs)` để trừ kho nguyên liệu có điều kiện.
- Tạo `Order`, `OrderItem`, `OrderItemTopping` và bản ghi `OrderStatusHistory` ban đầu.
- Lưu snapshot `OrderIngredientUsage` từ danh sách nguyên liệu đã trừ thành công.

Việc trừ kho, tạo đơn và ghi snapshot phải nằm trong cùng Prisma transaction. Nếu một bước thất bại, transaction phải rollback toàn bộ các thay đổi liên quan.

**2. Chuyển trạng thái đơn hàng**

Các file triển khai:

- `backend/src/modules/orders/order.service.ts`
- `backend/src/modules/orders/order-state.ts`

`OrderService.transition()` chịu trách nhiệm kiểm tra chuyển trạng thái hợp lệ, cập nhật trạng thái đơn và ghi lịch sử trạng thái. Các thao tác chuyển trạng thái phải tuân theo state machine của dự án.

**3. Hủy đơn hàng**

File triển khai: `backend/src/modules/orders/cancel/cancel-order.service.ts`

Theo thiết kế CR-01, việc hủy đơn phải hoàn trả nguyên liệu dựa trên snapshot `OrderIngredientUsage` thông qua helper `restoreIngredients(tx, usages)`. Việc hoàn kho, chuyển trạng thái và ghi lịch sử phải được thực hiện trong cùng transaction, đồng thời ngăn hoàn kho hai lần.

**Lưu ý về tiến độ:** Phần tạo đơn theo tồn kho nguyên liệu thuộc CR-Hanh. Phần hoàn kho khi hủy đơn thuộc CR-VuHuy. Chỉ xác nhận phần hủy đơn đã được triển khai sau khi kiểm tra và tích hợp code tương ứng.

---

## 2. PHÍA FRONTEND (NEXT.JS & REACT)

### 2.1. Service và kiểu dữ liệu Order

**File triển khai thực tế:** `frontend/src/services/order.service.ts`

File này định nghĩa các kiểu dữ liệu và các hàm giao tiếp với API Order, bao gồm:

- `OrderStatus`: các trạng thái của đơn hàng.
- `CreateOrderItemDto`: dữ liệu của một dòng hàng khi tạo đơn.
- `CreateOrderDto`: dữ liệu gửi lên API tạo đơn, gồm danh sách món và mã khuyến mãi tùy chọn.
- `OrderDetail`: thông tin chi tiết đơn hàng.
- `OrderSummaryItem` và `OrderHistoryResponse`: dữ liệu tóm tắt và phân trang lịch sử đơn hàng.

Các kiểu dữ liệu chính được định nghĩa trong service:

```typescript
export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CreateOrderItemDto {
  productId: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  toppingIds?: string[];
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  promotionCode?: string;
}
```

Hàm `createOrder(dto)` chuẩn hóa dữ liệu đầu vào, chuyển danh sách topping rỗng thành giá trị không bắt buộc và chuẩn hóa mã khuyến mãi trước khi gửi request.

Các hàm API liên quan được triển khai trong cùng file:

- `createOrder(dto)`: tạo đơn hàng bằng `POST /orders`.
- `getOrderById(orderId)`: lấy chi tiết đơn hàng.
- `cancelOrder(orderId)`: gửi yêu cầu hủy đơn.
- `getOrderHistory(params)`: lấy lịch sử đơn hàng có phân trang và bộ lọc trạng thái.

Các request sử dụng `fetchApi` từ `frontend/src/lib/api-client.ts`.

### 2.2. Luồng Checkout tạo đơn hàng

**File triển khai thực tế:** `frontend/src/app/checkout/page.tsx`

Luồng Checkout sử dụng `createOrder()` và `cancelOrder()` từ `frontend/src/services/order.service.ts`. File này không sử dụng custom hook `useCreateOrder.ts` trong cấu trúc đã kiểm tra.

Luồng xử lý chính:

1. Kiểm tra trạng thái đăng nhập thông qua `useRequireAuth()`.
2. Lấy các món trong giỏ hàng và thông tin đơn hàng tạm thời từ `useCartStore`.
3. Ngăn gửi yêu cầu tạo đơn khi giỏ hàng rỗng hoặc request đang được xử lý.
4. Tính chữ ký giỏ hàng bằng `computeCartSignature()` để xác định giỏ hàng có thay đổi hay không.
5. Nếu đã có `pendingOrderId` và chữ ký giỏ hàng vẫn giống trước đó, sử dụng lại đơn hiện có và chuyển sang trang thanh toán.
6. Nếu giỏ hàng đã thay đổi, thử hủy đơn đang chờ trước khi tạo đơn mới.
7. Gọi `createOrder()` để gửi danh sách món, size, số lượng, topping và mã khuyến mãi đến backend.
8. Khi tạo đơn thành công, lưu `pendingOrderId` cùng chữ ký giỏ hàng và chuyển sang trang thanh toán.
9. Nếu request thất bại, hiển thị thông báo lỗi cho người dùng.

Phần gọi tạo đơn được thực hiện như sau:

```typescript
const order = await createOrder({
  items: items.map((i) => ({
    productId: i.productId,
    size: i.size,
    quantity: i.quantity,
    toppingIds:
      i.toppingIds.length > 0 ? i.toppingIds : undefined,
  })),
  promotionCode: promoCode.trim() || undefined,
});

setPendingOrder(order.id, currentSignature);
router.push(`/checkout/payment?orderId=${order.id}`);
```

Frontend chịu trách nhiệm thu thập lựa chọn của khách hàng và điều hướng giao diện. Backend vẫn là nơi xác thực request, tính giá, kiểm tra công thức nguyên liệu, trừ kho và tạo đơn hàng.

**Lưu ý:** Nội dung trên mô tả cấu trúc và luồng xử lý theo repository snapshot đã kiểm tra. Khi mã nguồn thay đổi, cần đối chiếu lại đường dẫn và kiểu dữ liệu thực tế trước khi cập nhật tài liệu.

## 3. Lịch sử thay đổi
- v1.0 (2026-10-10): Khởi tạo tài liệu FE-BE Skeleton Order Module.
- v1.1 – áp dụng quyết định D1, D3, D5, D6, D7 (ngày 2026-10-16).
- v1.2 (2026-10-29): Cập nhật luồng tạo đơn theo CR-01, sử dụng công thức nguyên liệu, trừ kho bằng deductIngredients() và lưu snapshot OrderIngredientUsage.
