# BrewLite — Tài liệu hợp đồng API: Chi tiết sản phẩm

**Trạng thái:** Bản nháp — Chờ đánh giá
**Người phụ trách:** Product Detail
**Giai đoạn:** Architecture Mapping
**Cập nhật lần cuối:** 09/10/2026

---

## 1. Mục đích

Tài liệu này mô tả hợp đồng API dùng để lấy thông tin chi tiết sản phẩm trong hệ thống BrewLite.

API cung cấp dữ liệu để Frontend hiển thị trang chi tiết sản phẩm, bao gồm tên, hình ảnh, giá gốc, tình trạng sản phẩm, kích cỡ và topping.

Backend chịu trách nhiệm xác định giá chính thức. Frontend có thể tính giá ước tính để hiển thị khi người dùng thay đổi lựa chọn.

**Lưu ý:** Cấu trúc API phải thống nhất với `schema.prisma` và tài liệu `db-mapping.md` trước khi chốt hợp đồng.

## 2. Thông tin API

| Thuộc tính    | Giá trị                             |
| ------------- | ----------------------------------- |
| Phương thức   | `GET`                               |
| Endpoint      | `/api/v1/products/:id`              |
| Chức năng     | Lấy thông tin chi tiết một sản phẩm |
| Mã thành công | `200 OK`                            |
| Xác thực      | Chờ nhóm xác nhận                   |
| Kiểu dữ liệu  | `application/json`                  |

### Tham số đường dẫn

| Tham số | Kiểu dữ liệu | Bắt buộc | Ý nghĩa                            |
| ------- | ------------ | -------- | ---------------------------------- |
| `id`    | `string`     | Có       | Mã định danh duy nhất của sản phẩm |

Theo `schema.prisma`, ID của sản phẩm được tạo bằng CUID thông qua `@default(cuid())`.

## 3. Phản hồi khi thành công

Tất cả phản hồi thành công phải tuân theo định dạng chung trong `checklist-review.md`.

**HTTP Status:** `200 OK`

Ví dụ phản hồi đề xuất:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "clproduct001",
    "name": "Latte",
    "imageUrl": "/images/latte.jpg",
    "basePrice": 35000,
    "currency": "VND",
    "available": true,
    "sizes": [
      {
        "size": "M",
        "priceAdjustment": 0
      },
      {
        "size": "L",
        "priceAdjustment": 10000
      }
    ],
    "toppings": []
  },
  "timestamp": "2026-10-09T14:00:00.000Z"
}
```

Dữ liệu trên chỉ mang tính minh họa, không phải dữ liệu thật trong database. Danh sách kích cỡ, giá và topping cần được lấy từ dữ liệu thực tế.

### Giải thích các trường

* `success`: Cho biết yêu cầu có thành công hay không.
* `statusCode`: Mã trạng thái HTTP.
* `data`: Dữ liệu chi tiết sản phẩm.
* `id`: Mã sản phẩm, được lưu trong `Product.id`.
* `name`: Tên sản phẩm, được lưu trong `Product.name`.
* `imageUrl`: Đường dẫn hình ảnh, được lưu trong `Product.imageUrl`; có thể là `null` nếu chưa có ảnh.
* `basePrice`: Giá gốc, được lấy từ `Product.basePrice`.
* `currency`: Đơn vị tiền tệ theo quy ước API, hiện dự kiến là `VND`.
* `available`: Trạng thái có thể bán, ánh xạ từ `Product.isAvailable`.
* `sizes`: Danh sách kích cỡ và phụ phí, lấy từ `ProductSizePrice`.
* `size`: Giá trị kích cỡ theo enum `ProductSize`, gồm `S`, `M`, `L`.
* `priceAdjustment`: Phần giá cộng thêm, lấy từ `ProductSizePrice.priceAdjustment`.
* `toppings`: Danh sách topping được phép chọn; cách xác định topping theo từng sản phẩm cần nhóm thống nhất.
* `timestamp`: Thời điểm tạo phản hồi.

Trường `description` chưa được đưa vào response vì model `Product` trong `schema.prisma` hiện chưa có trường này. Nếu giao diện bắt buộc phải hiển thị mô tả, nhóm cần thống nhất bổ sung trường vào schema hoặc có nguồn dữ liệu khác.

Backend sử dụng `TransformInterceptor` để bọc phản hồi thành công theo định dạng chung của nhóm, nếu interceptor này được triển khai đúng như quy ước dự án.

## 4. Phản hồi khi xảy ra lỗi

Tất cả phản hồi lỗi phải tuân theo định dạng trong `checklist-review.md`.

### 4.1. Không tìm thấy sản phẩm

**HTTP Status:** `404 Not Found`

```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Không tìm thấy sản phẩm",
  "timestamp": "2026-10-09T14:00:00.000Z",
  "path": "/api/v1/products/clproduct001"
}
```

### 4.2. ID sản phẩm không hợp lệ

* `400 Bad Request` nếu ID sai định dạng.
* `404 Not Found` nếu ID đúng định dạng nhưng không tìm thấy sản phẩm.

### 4.3. Lỗi hệ thống

**HTTP Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Đã xảy ra lỗi không mong muốn",
  "timestamp": "2026-10-09T14:00:00.000Z",
  "path": "/api/v1/products/clproduct001"
}
```

Backend sử dụng `AllExceptionsFilter` để định dạng phản hồi lỗi nếu filter này đã được triển khai. Với lỗi validation từ `ValidationPipe`, trường `message` có thể chứa một hoặc nhiều thông báo lỗi theo quy chuẩn nhóm.

## 5. Quy tắc nghiệp vụ

1. Backend là nguồn xác định giá chính thức.
2. Giá sản phẩm bắt đầu từ `basePrice`.
3. Khi chọn kích cỡ, cộng thêm `priceAdjustment` tương ứng.
4. Mỗi topping được chọn sẽ cộng thêm giá topping tương ứng.
5. Việc cho phép chọn nhiều topping và có được chọn trùng topping hay không cần được nhóm xác nhận.
6. Số lượng sản phẩm phải lớn hơn hoặc bằng `1` khi sử dụng trong giỏ hàng hoặc đặt hàng.
7. Số lượng tối đa chưa được nhóm xác định.
8. Trạng thái `Product.isAvailable` cho biết sản phẩm có được phép bán hay không.
9. `Product.stock` biểu thị số lượng tồn kho; cách xử lý khi hết hàng cần được nhóm thống nhất.
10. Chỉ trả về các kích cỡ và topping hợp lệ theo quy tắc nghiệp vụ đã được thống nhất.

**Công thức tính giá đề xuất:**

`unitPrice = basePrice + size.priceAdjustment + tổng giá topping được chọn`

Công thức trên là giá cho một sản phẩm sau khi chọn kích cỡ và topping. Tổng tiền của nhiều sản phẩm còn phụ thuộc số lượng.

Backend cần xác thực lại giá và lựa chọn của người dùng khi tạo đơn hàng; không sử dụng giá do Frontend gửi lên làm giá thanh toán đáng tin cậy.

## 6. Ánh xạ dữ liệu API với database

| Trường API                | Nguồn dữ liệu                      | Ghi chú                                               |
| ------------------------- | ---------------------------------- | ----------------------------------------------------- |
| `id`                      | `Product.id`                       | ID dạng CUID                                          |
| `name`                    | `Product.name`                     | Tên sản phẩm                                          |
| `imageUrl`                | `Product.imageUrl`                 | Có thể là `null`                                      |
| `basePrice`               | `Product.basePrice`                | Kiểu Decimal trong Prisma                             |
| `currency`                | Quy ước API                        | Dự kiến là `VND`, không phải trường trong Product     |
| `available`               | `Product.isAvailable`              | Tên trường API khác tên trường database               |
| `sizes`                   | `ProductSizePrice`                 | Lấy danh sách kích cỡ theo sản phẩm                   |
| `sizes[].size`            | `ProductSizePrice.size`            | Enum gồm `S`, `M`, `L`                                |
| `sizes[].priceAdjustment` | `ProductSizePrice.priceAdjustment` | Phụ phí kích cỡ                                       |
| `toppings`                | `Topping`                          | Schema hiện chưa có quan hệ trực tiếp Product–Topping |
| `description`             | Chưa có nguồn dữ liệu              | Model `Product` hiện chưa có trường này               |

### Các model liên quan

* `Product`: Thông tin sản phẩm, giá gốc, tồn kho và trạng thái bán.
* `ProductSizePrice`: Phụ phí theo kích cỡ của từng sản phẩm.
* `Topping`: Tên, giá, tồn kho và trạng thái bán của topping.
* `Category`: Danh mục sản phẩm.

**Lưu ý:** Schema hiện tại chưa định nghĩa quan hệ trực tiếp giữa `Product` và `Topping`. Nhóm cần thống nhất cách xác định topping nào được phép chọn cho từng sản phẩm trước khi chốt API.

Trường `description` cũng chưa tồn tại trong model `Product`. Nếu giao diện cần hiển thị mô tả, nhóm cần thống nhất có bổ sung trường này vào database hay không.


## 7. Tích hợp với Frontend

Frontend có trách nhiệm:

* Gọi `GET /api/v1/products/:id` để lấy chi tiết sản phẩm.
* Hiển thị tên, hình ảnh, giá gốc, kích cỡ, topping và trạng thái bán.
* Hiển thị trạng thái đang tải dữ liệu (`loading`) và trạng thái lỗi (`error`).
* Tính giá ước tính khi người dùng thay đổi kích cỡ hoặc topping.
* Xử lý trường `imageUrl` có giá trị `null`.
* Không coi giá ước tính trên giao diện là giá thanh toán chính thức.
* Thống nhất kiểu dữ liệu giá giữa Frontend và Backend, đặc biệt khi Prisma sử dụng `Decimal`.

## 8. Phạm vi không bao gồm

API này không xử lý:

* Thêm sản phẩm vào giỏ hàng.
* Tạo đơn hàng.
* Xử lý thanh toán.
* Đăng ký và đăng nhập tài khoản.

Các chức năng trên thuộc phạm vi của những feature và API tương ứng.