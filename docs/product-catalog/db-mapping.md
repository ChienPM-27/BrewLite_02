# Database Mapping – Product Catalog
## 1. Tổng quan
Phân hệ Product Catalog sử dụng dữ liệu từ PostgreSQL thông qua Prisma để cung cấp danh sách sản phẩm cho giao diện menu của khách hàng.
Backend sử dụng model Product làm nguồn dữ liệu chính, đồng thời truy vấn các quan hệ Category và ProductSizePrice để bổ sung thông tin danh mục và giá phụ thu theo kích cỡ.
API: GET /api/v1/products
## 2. Mapping Product Entity to API Response
### 2.1. Product

| Database field | API response field | Data Type | Ý nghĩa |
|---|---|---|
| `id` | `id` | `string` | Mã định danh sản phẩm |
| `name` | `name` | `string` | Tên sản phẩm |
| `basePrice` | `basePrice` | `Decimal` | Giá cơ bản của sản phẩm |
| `imageUrl` | `imageUrl` | `string`| Đường dẫn hình ảnh sản phẩm|
| `isAvailable` | `isAvailable` | `Boolean`| Trạng thái mở bán của sản phẩm |

### 2.2. Category

| Database field | API response field | Data Type | Ý nghĩa |
|---|---|---|
| `name` | `categoryName` | `string`| Tên danh mục |

### 2.3. ProductSizePrice

| Database field | API response field | Data Type | Ý nghĩa |
|---|---|---|
| `size` | `sizePrices[].size` | `string`| Kích cỡ sản phẩm |
| `priceAdjustment` | `sizePrices[].priceAdjustment` | `Decimal(12, 0)`| Khoản phụ thu theo kích cỡ|

## 3. Mapping quan hệ dữ liệu 
### 3.1. Product — Category
* Mỗi sản phẩm (Product) có thể thuộc về một danh mục (Category) thông qua trường categoryId. Trường này dùng để xác định sản phẩm thuộc danh mục nào trong cơ sở dữ liệu.

* Khi lấy danh sách sản phẩm, Backend truy vấn thêm thông tin danh mục và lấy tên danh mục từ trường Category.name, sau đó trả về cho Frontend dưới tên trường categoryName.

* Nếu sản phẩm chưa được gán danh mục, categoryName sẽ có giá trị null.

### 3.2. Product — ProductSizePrice

Model `ProductSizePrice` lưu kích cỡ và khoản phụ thu tương ứng của sản phẩm. Backend trả danh sách này trong trường `sizePrices`.

Giá cơ bản được trả trong `basePrice`; phụ thu theo kích cỡ được trả riêng trong `priceAdjustment`.


