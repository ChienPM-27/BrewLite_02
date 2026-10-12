# BrewLite — DB Mapping: Chi tiết sản phẩm

**Trạng thái:** Bản nháp — Chờ đánh giá
**Người phụ trách:** Product Detail
**Giai đoạn:** Architecture Mapping
**Cập nhật lần cuối:** 09/10/2026

---

## 1. Mục đích

Tài liệu này mô tả cách ánh xạ dữ liệu giữa PostgreSQL, Prisma và API của tính năng Product Detail dựa trên file `schema.prisma` hiện tại của dự án BrewLite.

Mục tiêu là xác định dữ liệu Backend có thể lấy để hiển thị chi tiết sản phẩm, kích cỡ, topping và giá tiền mà không tạo thêm cấu trúc trùng với schema hiện có.

Phạm vi chính:

* `Product`: thông tin sản phẩm.
* `ProductSizePrice`: kích cỡ và phụ phí của sản phẩm.
* `Topping`: thông tin topping.
* `Category`: danh mục sản phẩm.
* Các model liên quan đến đơn hàng để làm rõ cách lưu lựa chọn sản phẩm.

**Lưu ý:** Đây là tài liệu ánh xạ dữ liệu, không phải yêu cầu thay đổi `schema.prisma`.

## 2. Quy ước đặt tên

Áp dụng `naming-convention.md` của nhóm:

* Tên model Prisma: `PascalCase`, số ít.
* Tên bảng PostgreSQL: `snake_case`, số nhiều.
* Tên trường trong Prisma: `camelCase`.
* Tên cột được ánh xạ bằng `@map()` nếu cần dùng `snake_case`.
* Khóa chính có tên `id`, kiểu `String`, mặc định sử dụng `cuid()` trong schema hiện tại.
* Khóa ngoại dùng tên theo quy tắc `<tên_thực_thể>Id`.

## 3. Ánh xạ model hiện có

### 3.1. Product — Sản phẩm

**Prisma Model:** `Product`
**Bảng PostgreSQL:** `products`

| Trường Prisma | Kiểu dữ liệu    | Ý nghĩa                                            |
| ------------- | --------------- | -------------------------------------------------- |
| `id`          | `String`        | Mã sản phẩm, dùng CUID                             |
| `categoryId`  | `String?`       | Mã danh mục, có thể không có                       |
| `name`        | `String`        | Tên sản phẩm                                       |
| `basePrice`   | `Decimal(12,0)` | Giá gốc tính bằng VND                              |
| `imageUrl`    | `String?`       | Đường dẫn hình ảnh, có thể không có                |
| `stock`       | `Int`           | Số lượng tồn kho, mặc định `0`                     |
| `version`     | `Int`           | Phiên bản phục vụ Optimistic Locking, mặc định `0` |
| `isAvailable` | `Boolean`       | Trạng thái bán, mặc định `true`                    |
| `createdAt`   | `DateTime`      | Thời điểm tạo                                      |
| `updatedAt`   | `DateTime`      | Thời điểm cập nhật                                 |

**Quan hệ hiện có:**

* `Product` có thể thuộc một `Category`.
* `Product` có nhiều bản ghi `ProductSizePrice`.
* `Product` có thể xuất hiện trong nhiều `OrderItem`.

**Lưu ý:** Schema hiện tại chưa có trường `description`. Nếu API Product Detail bắt buộc trả về mô tả sản phẩm, nhóm cần thống nhất bổ sung trường này hoặc điều chỉnh API Contract.

Trường `available` trong API có thể được ánh xạ từ `Product.isAvailable`. Tuy nhiên, quy tắc kết hợp trạng thái bán với tồn kho `stock` cần được xác nhận.

### 3.2. ProductSizePrice — Giá theo kích cỡ

**Prisma Model:** `ProductSizePrice`
**Bảng PostgreSQL:** `product_size_prices`

| Trường Prisma     | Kiểu dữ liệu    | Ý nghĩa                       |
| ----------------- | --------------- | ----------------------------- |
| `id`              | `String`        | Mã bản ghi giá kích cỡ        |
| `productId`       | `String`        | Mã sản phẩm                   |
| `size`            | `ProductSize`   | Kích cỡ `S`, `M` hoặc `L`     |
| `priceAdjustment` | `Decimal(12,0)` | Phụ phí kích cỡ, mặc định `0` |

Model `ProductSizePrice` liên kết với `Product` thông qua `productId`.

Ràng buộc `@@unique([productId, size])` bảo đảm mỗi sản phẩm không có hai bản ghi giá cho cùng một kích cỡ.

Kích cỡ được định nghĩa bằng enum `ProductSize`, không phải bằng một model riêng.

| Giá trị enum | Ý nghĩa |
| ------------ | ------- |
| `S`          | Nhỏ     |
| `M`          | Vừa     |
| `L`          | Lớn     |

**Quy tắc giá:** Giá của sản phẩm theo kích cỡ bằng giá gốc cộng phụ phí của kích cỡ được chọn.

### 3.3. Topping — Topping thêm vào đồ uống

**Prisma Model:** `Topping`
**Bảng PostgreSQL:** `toppings`

| Trường Prisma | Kiểu dữ liệu    | Ý nghĩa                              |
| ------------- | --------------- | ------------------------------------ |
| `id`          | `String`        | Mã topping                           |
| `name`        | `String`        | Tên topping, không trùng lặp         |
| `price`       | `Decimal(12,0)` | Giá topping tính bằng VND            |
| `stock`       | `Int`           | Tồn kho, mặc định `100`              |
| `isAvailable` | `Boolean`       | Trạng thái cung cấp, mặc định `true` |
| `createdAt`   | `DateTime`      | Thời điểm tạo                        |
| `updatedAt`   | `DateTime`      | Thời điểm cập nhật                   |

Topping hiện liên kết với `OrderItemTopping`, là model dùng để ghi nhận topping được chọn trong từng món thuộc đơn hàng.

**Điểm cần lưu ý:** Schema hiện tại chưa có quan hệ trực tiếp giữa `Product` và `Topping`. Vì vậy, chưa thể xác định từ schema rằng topping nào được phép chọn cho từng sản phẩm.

Nhóm cần quyết định có bổ sung quan hệ sản phẩm–topping hay sử dụng một quy tắc chung khác.

### 3.4. Category — Danh mục sản phẩm

**Prisma Model:** `Category`
**Bảng PostgreSQL:** `categories`

| Trường Prisma  | Kiểu dữ liệu | Ý nghĩa                              |
| -------------- | ------------ | ------------------------------------ |
| `id`           | `String`     | Mã danh mục                          |
| `name`         | `String`     | Tên danh mục, không trùng lặp        |
| `slug`         | `String`     | Đường dẫn định danh, không trùng lặp |
| `displayOrder` | `Int`        | Thứ tự hiển thị, mặc định `0`        |
| `createdAt`    | `DateTime`   | Thời điểm tạo                        |
| `updatedAt`    | `DateTime`   | Thời điểm cập nhật                   |

`Product.categoryId` là khóa ngoại tùy chọn liên kết tới `Category.id`.

Category không bắt buộc để trả về chi tiết sản phẩm theo API hiện tại, nhưng có thể được sử dụng nếu giao diện cần hiển thị danh mục.

## 4. Các model liên quan đến đơn hàng

Những model dưới đây không phải trọng tâm của API Product Detail, nhưng có liên quan đến việc lưu lựa chọn sản phẩm khi tạo đơn hàng.

### 4.1. OrderItem — Món trong đơn hàng

**Bảng PostgreSQL:** `order_items`

Các trường liên quan:

* `productId`: mã sản phẩm được đặt.
* `size`: kích cỡ được chọn, mặc định `M`.
* `quantity`: số lượng, mặc định `1`.
* `unitPrice`: đơn giá đã cộng phụ phí kích cỡ.
* `lineTotal`: tổng tiền dòng sản phẩm, có tính topping và số lượng.

### 4.2. OrderItemTopping — Topping của món trong đơn

**Bảng PostgreSQL:** `order_item_toppings`

Các trường liên quan:

* `orderItemId`: mã món trong đơn hàng.
* `toppingId`: mã topping được chọn.
* `price`: giá topping được lưu tại thời điểm đặt hàng.

Việc lưu giá topping tại thời điểm đặt giúp ghi nhận giá của đơn hàng, thay vì phụ thuộc hoàn toàn vào giá hiện tại trong `Topping`.

## 5. Sơ đồ quan hệ hiện tại

```text
Category
   |
   | 1 - N
   v
Product
   |
   | 1 - N
   v
ProductSizePrice

Product
   |
   | 1 - N
   v
OrderItem
   |
   | 1 - N
   v
OrderItemTopping
   |
   | N - 1
   v
Topping
```

Sơ đồ trên thể hiện các quan hệ đã có trong `schema.prisma`.

Hiện tại, không có quan hệ trực tiếp `Product` — `Topping`. Không được hiểu sơ đồ này là sản phẩm đã có danh sách topping được phép chọn.

## 6. Ánh xạ Database sang API Product Detail

**Endpoint:** `GET /api/v1/products/:id`

| Trường API                     | Nguồn dữ liệu hiện tại             | Ghi chú                      |
| ------------------------------ | ---------------------------------- | ---------------------------- |
| `data.id`                      | `Product.id`                       | Mã sản phẩm                  |
| `data.name`                    | `Product.name`                     | Tên sản phẩm                 |
| `data.description`             | Chưa có trong schema               | Cần nhóm quyết định          |
| `data.imageUrl`                | `Product.imageUrl`                 | Có thể là `null`             |
| `data.basePrice`               | `Product.basePrice`                | Giá gốc                      |
| `data.currency`                | Quy ước API                        | Dùng `VND` theo API Contract |
| `data.available`               | `Product.isAvailable`              | Cần thống nhất với tồn kho   |
| `data.sizes[]`                 | `Product.sizePrices`               | Danh sách kích cỡ và phụ phí |
| `data.sizes[].id`              | `ProductSizePrice.id`              | Mã bản ghi giá kích cỡ       |
| `data.sizes[].name`            | `ProductSizePrice.size`            | Giá trị `S`, `M`, `L`        |
| `data.sizes[].priceAdjustment` | `ProductSizePrice.priceAdjustment` | Phụ phí kích cỡ              |
| `data.toppings[]`              | Chưa có quan hệ sản phẩm–topping   | Cần nhóm xác nhận cách lấy   |
| `data.toppings[].id`           | `Topping.id`                       | Mã topping                   |
| `data.toppings[].name`         | `Topping.name`                     | Tên topping                  |
| `data.toppings[].price`        | `Topping.price`                    | Giá topping                  |

Các trường API chỉ được lấy từ những quan hệ và dữ liệu thực sự có trong schema, hoặc được bổ sung sau khi nhóm thống nhất.

## 7. Quy tắc tính giá

Theo API Contract của Product Detail:

`unitPrice = basePrice + priceAdjustment + tổng giá topping được chọn`

Trong đó:

* `basePrice` lấy từ `Product.basePrice`.
* `priceAdjustment` lấy từ `ProductSizePrice.priceAdjustment` ứng với sản phẩm và kích cỡ được chọn.
* Giá topping lấy từ `Topping.price`.
* Backend xác thực các lựa chọn trước khi tính giá chính thức.
* Không cho phép chọn lặp cùng một topping.
* Tiền được lưu bằng `Decimal(12,0)`, phù hợp với quy ước lưu tiền VND nguyên chẵn trong schema hiện tại.

**Lưu ý:** `OrderItem.unitPrice` được mô tả là đơn giá đã cộng phụ phí kích cỡ, còn `OrderItem.lineTotal` tính cả topping và số lượng. Cách áp dụng chính xác công thức này khi tạo đơn cần được thống nhất với feature Cart/Orders để tránh tính trùng tiền.