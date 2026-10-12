# FE-BE SKELETON: PRODUCT CATALOG
* Trạng thái: Đang phát triển
## 1. Cấu trúc đề xuất cho Product Catalog
## 1.1 Frontend
```
frontend/
└── src/
    ├── app/
    │
    ├── components/
    │   └── product-catalog/
    │       ├── ProductCard.tsx
    │       ├── ProductList.tsx
    │       ├── ProductFilters.tsx
    │       └── ProductEmptyState.tsx
    │
    ├── services/
    │   └── product-catalog.ts
    ├── types/
    │   └── product-catalog.ts
    └── lib/
        └── api-client.ts
```
## 1.2 Backend
* Backend chịu trách nhiệm tiếp nhận yêu cầu lấy danh sách sản phẩm, xử lý nghiệp vụ và trả dữ liệu theo API Contract.
```
backend/
└── src/
    └── modules/
        └── product-catalog/
            ├── product-catalog.module.ts
            ├── product-catalog.service.ts
            └── product-catalog.controller.ts
```
## 2. Mô tả chi tiết
### 2.1 Frontend
* Frontend chịu trách nhiệm hiển thị menu sản phẩm, trình bày thông tin sản phẩm và hỗ trợ người dùng tìm kiếm, lọc sản phẩm theo phạm vi chức năng đã thống nhất.

| Tên file | Trách nhiệm |
|---|---|
| `app/` | Chứa các trang giao diện của ứng dụng, bao gồm trang menu sản phẩm. |
| `components/product-catalog/ProductCard.tsx` | Hiển thị thông tin của một sản phẩm gồm tên, giá và hình ảnh. |
| `components/product-catalog/ProductList.tsx` | Hiển thị danh sách sản phẩm thông qua component `ProductCard`. |
| `components/product-catalog/ProductFilters.tsx` | Cung cấp chức năng tìm kiếm sản phẩm theo tên và lọc sản phẩm theo danh mục. |
| `components/product-catalog/ProductEmptyState.tsx` | Hiển thị thông báo khi danh sách sản phẩm trống hoặc không có sản phẩm phù hợp với điều kiện tìm kiếm, lọc. |
| `services/product-catalog.ts` | Chứa hàm gọi API `GET /api/v1/products` để lấy danh sách sản phẩm từ backend. |
| `types/product-catalog.ts` | Định nghĩa kiểu dữ liệu sản phẩm, bảo đảm dữ liệu frontend phù hợp với API Contract. |

### 2.2. Backend

| Tên file | Trách nhiệm |
|---|---|
| `modules/product-catalog/product-catalog.module.ts` | Khai báo module Product Catalog và kết nối controller, service cùng các thành phần phụ thuộc. |
| `modules/product-catalog/product-catalog.controller.ts` | Tiếp nhận request `GET /api/v1/products` và chuyển yêu cầu xử lý đến service. |
| `modules/product-catalog/product-catalog.service.ts` | Xử lý nghiệp vụ lấy danh sách sản phẩm, truy vấn dữ liệu qua Prisma và trả về kết quả theo API Contract. |

## 3. API sử dụng

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/products` | Lấy danh sách sản phẩm đang được mở bán. |