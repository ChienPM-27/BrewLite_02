# BrewLite — FE/BE Skeleton: Product Detail

**Trạng thái:** Bản nháp — Chờ nhóm đánh giá
**Người phụ trách:** Product Detail
**Giai đoạn:** Architecture Mapping
**Cập nhật lần cuối:** 09/10/2026

---

## 1. Mục đích

Tài liệu này xác định vị trí triển khai chức năng Product Detail dựa trên cấu trúc thư mục hiện tại của BrewLite.

Mục tiêu:

* Tuân thủ cấu trúc repository mà nhóm đã thống nhất.
* Xác định vị trí các file Frontend và Backend.
* Phân chia trách nhiệm giữa giao diện, API client, controller và service.
* Bảo đảm việc triển khai phù hợp với `api-contract.md`, `db-mapping.md` và `schema.prisma`.

Tài liệu này chỉ xác định cấu trúc và trách nhiệm, chưa triển khai logic hoàn chỉnh.

## 2. Kiến trúc hiện tại

Repository được chia thành các phần chính:

| Thư mục/File                     | Trách nhiệm                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `backend/`                       | NestJS API, chạy ở port `4000` theo cấu trúc nhóm cung cấp         |
| `backend/src/common/`            | Thành phần dùng chung như interceptor và exception filter          |
| `backend/src/modules/`           | Các module nghiệp vụ như auth, products, orders, payments          |
| `backend/src/prisma/`            | Prisma service và client theo cấu trúc hiện tại                    |
| `backend/prisma/schema.prisma`   | Định nghĩa schema PostgreSQL                                       |
| `frontend/`                      | Next.js App Router, chạy ở port `3000` theo cấu trúc nhóm cung cấp |
| `frontend/src/app/`              | Các trang và route của ứng dụng                                    |
| `frontend/src/components/`       | UI dùng chung và các component nghiệp vụ theo quy ước nhóm         |
| `frontend/src/lib/api-client.ts` | Fetch wrapper dùng chung để gọi Backend                            |
| `docs/`                          | Tài liệu kỹ thuật và quy ước làm việc                              |
| `docker-compose.yml`             | Cấu hình PostgreSQL container                                      |
| `.env.example`                   | Mẫu biến môi trường                                                |
| `README.md`                      | Hướng dẫn chung của dự án                                          |

## 3. Cấu trúc đề xuất cho Product Detail

Các file dưới đây là **đề xuất bổ sung vào cấu trúc hiện tại**, không có nghĩa là tất cả đã tồn tại trong repository.

### 3.1. Frontend

```text
frontend/
└── src/
    ├── app/
    │   └── products/
    │       └── [id]/
    │           └── page.tsx
    │
    ├── components/
    │   └── product-detail/
    │       ├── ProductInfo.tsx
    │       ├── SizeSelector.tsx
    │       ├── ToppingSelector.tsx
    │       └── ProductPrice.tsx
    │
    └── lib/
        └── api-client.ts
```

File `api-client.ts` đã nằm trong cấu trúc hiện tại nên **tái sử dụng**, không tạo thêm một API client riêng nếu chưa có yêu cầu từ nhóm.

Nếu nhóm muốn tách riêng logic nghiệp vụ Product Detail, có thể bổ sung thư mục `features/product-detail/` sau khi được thống nhất. Bản skeleton hiện tại không bắt buộc tạo thư mục đó.

### 3.2. Trách nhiệm Frontend

| File                         | Trách nhiệm                                            |
| ---------------------------- | ------------------------------------------------------ |
| `app/products/[id]/page.tsx` | Nhận ID từ URL và hiển thị trang chi tiết sản phẩm     |
| `ProductInfo.tsx`            | Hiển thị tên, hình ảnh và thông tin cơ bản             |
| `SizeSelector.tsx`           | Hiển thị và cho phép chọn kích cỡ                      |
| `ToppingSelector.tsx`        | Hiển thị và quản lý lựa chọn topping trên giao diện    |
| `ProductPrice.tsx`           | Hiển thị giá gốc và giá ước tính theo lựa chọn         |
| `lib/api-client.ts`          | Gửi request đến Backend bằng cơ chế gọi API dùng chung |

Các component trong `components/product-detail/` là component dành riêng cho Product Detail, không phải component UI dùng chung toàn hệ thống.

Nếu quy ước hiện tại của nhóm yêu cầu component nghiệp vụ đặt ở vị trí khác, cần tuân thủ quy ước chung thay vì tạo cấu trúc song song.

### 3.3. Backend

```text
backend/
├── src/
│   ├── common/
│   │   ├── interceptors/
│   │   └── filters/
│   │
│   ├── modules/
│   │   └── products/
│   │       ├── products.module.ts
│   │       ├── products.controller.ts
│   │       ├── products.service.ts
│   │       └── dto/
│   │           └── product-detail.dto.ts
│   │
│   └── prisma/
│       └── prisma.service.ts
│
└── prisma/
    └── schema.prisma
```

Đây là sơ đồ vị trí dự kiến dựa trên kiến trúc nhóm cung cấp. Tên thư mục con trong `common/` và cách tổ chức Prisma cần giữ đúng tên thực tế trong repository nếu đã được tạo.

### 3.4. Trách nhiệm Backend

| File                        | Trách nhiệm                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `products.module.ts`        | Khai báo module Products và kết nối controller/service                 |
| `products.controller.ts`    | Tiếp nhận request `GET /api/v1/products/:id`                           |
| `products.service.ts`       | Truy vấn dữ liệu qua Prisma và chuẩn bị response                       |
| `dto/product-detail.dto.ts` | Định nghĩa cấu trúc dữ liệu response nếu nhóm sử dụng DTO cho response |
| `prisma.service.ts`         | Cung cấp Prisma Client cho các service nghiệp vụ                       |
| Interceptor dùng chung      | Định dạng response thành công theo quy ước nhóm nếu đã triển khai      |
| Exception filter dùng chung | Định dạng response lỗi theo quy ước nhóm nếu đã triển khai             |

Không tạo thêm interceptor hoặc exception filter riêng cho Product Detail nếu repository đã có thành phần dùng chung phù hợp.

## 4. API của Product Detail

| Thuộc tính              | Giá trị                |
| ----------------------- | ---------------------- |
| Method                  | `GET`                  |
| Endpoint                | `/api/v1/products/:id` |
| Controller dự kiến      | `ProductsController`   |
| Service dự kiến         | `ProductsService`      |
| Response thành công     | `200 OK`               |
| Không tìm thấy sản phẩm | `404 Not Found`        |

API prefix và response thực tế cần được đối chiếu với cấu hình Backend và `api-contract.md` trước khi tích hợp.

## 5. Luồng dữ liệu

```text
Người dùng mở trang chi tiết sản phẩm
                 |
                 v
frontend/src/app/products/[id]/page.tsx
                 |
                 v
frontend/src/lib/api-client.ts
                 |
                 v
GET /api/v1/products/:id
                 |
                 v
ProductsController
                 |
                 v
ProductsService
                 |
                 v
Prisma Service / Prisma Client
                 |
                 v
PostgreSQL
                 |
                 v
Backend trả response
                 |
                 v
Frontend hiển thị thông tin sản phẩm
```

### Trình tự xử lý

1. Người dùng truy cập trang chi tiết sản phẩm theo ID.
2. Frontend lấy ID từ URL.
3. Frontend sử dụng API client chung để gọi Backend.
4. `ProductsController` tiếp nhận request và chuyển xử lý cho `ProductsService`.
5. `ProductsService` truy vấn PostgreSQL thông qua Prisma.
6. Backend trả dữ liệu theo hợp đồng API.
7. Frontend hiển thị dữ liệu hoặc trạng thái loading/error.

## 6. Mapping với database

| Trường API    | Nguồn dữ liệu         | Ghi chú                                               |
| ------------- | --------------------- | ----------------------------------------------------- |
| `id`          | `Product.id`          | CUID                                                  |
| `name`        | `Product.name`        | Tên sản phẩm                                          |
| `imageUrl`    | `Product.imageUrl`    | Có thể `null`                                         |
| `basePrice`   | `Product.basePrice`   | Cần thống nhất kiểu JSON cho giá Decimal              |
| `available`   | `Product.isAvailable` | Ánh xạ tên trường API                                 |
| `sizes`       | `ProductSizePrice`    | Phụ phí theo kích cỡ                                  |
| `toppings`    | `Topping`             | Schema hiện chưa có quan hệ trực tiếp Product–Topping |
| `description` | Chưa xác định         | Model Product hiện chưa có trường này                 |

Không tự ý bổ sung trường hoặc quan hệ database chỉ trong code mà chưa thống nhất với nhóm.

## 7. Phạm vi Product Detail và Cart

Product Detail chịu trách nhiệm:

* Lấy và hiển thị thông tin sản phẩm.
* Cho phép chọn kích cỡ.
* Hiển thị topping theo quy tắc đã thống nhất.
* Hiển thị giá ước tính theo lựa chọn.

Cart chịu trách nhiệm quản lý giỏ hàng theo phân công của nhóm.

Cấu trúc dữ liệu dùng để chuyển sản phẩm, kích cỡ, topping và số lượng sang Cart phải được thống nhất với thành viên phụ trách Cart. Skeleton này không tự định nghĩa API thêm vào giỏ hàng.

## 8. Trạng thái giao diện

| Trạng thái    | Hành vi dự kiến                        |
| ------------- | -------------------------------------- |
| Loading       | Hiển thị trạng thái đang tải           |
| Success       | Hiển thị thông tin sản phẩm            |
| Not Found     | Thông báo không tìm thấy sản phẩm      |
| Error         | Hiển thị thông báo lỗi                 |
| Unavailable   | Thông báo sản phẩm không thể bán       |
| Missing image | Hiển thị ảnh mặc định hoặc placeholder |