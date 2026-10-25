# Test Cases: Product Catalog (Thực đơn sản phẩm)

> **Feature:** Product Catalog | **Owner:** Đinh Nhật Lan | **Phiên bản:** v1.1  
> **Phạm vi kiểm thử:** Kiểm thử API `GET /api/v1/products` phía Backend NestJS, logic lọc/chuyển đổi DTO, và toàn bộ trải nghiệm người dùng phía Frontend Next.js (`useProductCatalog`, `ProductCatalogView`).

---

## 1. PHẠM VI & MỤC TIÊU KIỂM THỬ

1. **Backend API (`GET /api/v1/products`):**
   - Kiểm tra việc lọc sản phẩm mở bán (`isAvailable === true`) và còn tồn kho (`stock > 0`).
   - Sắp xếp mặc định theo tên tăng dần (`name ASC`).
   - Kiểm tra việc bảo mật kinh doanh: tuyệt đối không trả trường `stock` ra client.
   - Kiểm tra tính đúng đắn của việc nạp danh mục (`categoryName`) và bảng giá theo size (`sizePrices`).
   - Kiểm tra định dạng response chuẩn bọc qua `TransformInterceptor`.
2. **Frontend UI & Hook (`useProductCatalog`):**
   - Kiểm thử trạng thái tải dữ liệu (Loading Skeleton).
   - Kiểm thử tìm kiếm không phân biệt hoa thường và không dấu tiếng Việt (`removeVietnameseTones`).
   - Kiểm thử lọc sản phẩm theo tab danh mục (bao gồm nhóm sản phẩm không có danh mục vào nhóm "Khác").
   - Kiểm thử trạng thái không tìm thấy món phù hợp (`NoResultsState`) và reset bộ lọc.
   - Kiểm thử xử lý lỗi mạng / server (`MenuErrorState`) và cơ chế bấm nút "Thử lại" (`retry()`).

---

## 2. DANH MỤC TEST CASES

### 2.1 Backend API Tests (`GET /api/v1/products`)

| ID | Tình huống kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-CAT-01** | Lấy danh sách thực đơn thành công | Gửi `GET /api/v1/products` (không cần Authorization header) | `200 OK`, trả về mảng sản phẩm dạng JSON bọc qua `TransformInterceptor` (`success: true, statusCode: 200, data: [...]`) |
| **TC-CAT-02** | Lọc bỏ sản phẩm ngừng kinh doanh | Có sản phẩm có `isAvailable = false` trong DB | Sản phẩm này tuyệt đối không xuất hiện trong mảng `data` trả về |
| **TC-CAT-03** | Lọc bỏ sản phẩm hết tồn kho | Có sản phẩm có `stock = 0` hoặc `stock < 0` trong DB | Sản phẩm này không xuất hiện trong mảng `data` |
| **TC-CAT-04** | Kiểm tra bảo mật trường `stock` | Kiểm tra toàn bộ các object sản phẩm trong response | Không có trường `stock` trong payload JSON trả về client |
| **TC-CAT-05** | Thứ tự sắp xếp mặc định | Nhiều sản phẩm thuộc các danh mục khác nhau | Danh sách được sắp xếp theo tên sản phẩm tăng dần (`name ASC`) |
| **TC-CAT-06** | Định dạng giá tiền Decimal sang Number | `basePrice` và `priceAdjustment` trong CSDL lưu `Decimal(12, 0)` | Khi trả về API, các giá trị này được ép kiểu sang kiểu số nguyên `Number` nguyên chẵn |
| **TC-CAT-07** | Sản phẩm có danh mục hợp lệ | Sản phẩm liên kết với một Category trong DB | Trường `categoryName` trả về đúng tên danh mục |
| **TC-CAT-08** | Sản phẩm không có danh mục (`categoryId = null`) | Sản phẩm độc lập không gán category | Trường `categoryName` trả về giá trị `null` |
| **TC-CAT-09** | Nạp danh sách phụ thu kích cỡ | Sản phẩm có các size S, M, L trong `ProductSizePrice` | Mảng `sizePrices` trả về đầy đủ các kích cỡ kèm phụ phí tương ứng |
| **TC-CAT-10** | CSDL chưa có sản phẩm nào khả dụng | Bảng `products` rỗng hoặc toàn bộ `isAvailable = false` | `200 OK`, mảng `data: []` rỗng, không bị lỗi 500 |
| **TC-CAT-11** | Lỗi kết nối CSDL | Ngắt kết nối PostgreSQL | Backend bắt lỗi qua `AllExceptionsFilter`, trả về `500 Internal Server Error` có cấu trúc chuẩn |

---

### 2.2 Frontend UI & Hook Tests (`useProductCatalog`)

| ID | Tình huống kiểm thử | Thao tác người dùng / Dữ liệu | Kết quả mong đợi |
|---|---|---|---|
| **TC-CAT-UI-01** | Trạng thái đang tải dữ liệu (Loading) | Người dùng mới truy cập trang `/menu` | Hiển thị khung xương tải trang `<ProductSkeleton />` (lưới 6 card mẫu) |
| **TC-CAT-UI-02** | Hiển thị lưới thực đơn thành công | API trả về danh sách sản phẩm | Ẩn skeleton, hiển thị danh sách các thẻ `<ProductCard />` với đầy đủ ảnh, tên món, giá và nút chọn món |
| **TC-CAT-UI-03** | Tìm kiếm sản phẩm có dấu tiếng Việt | Nhập từ khóa `"Cà phê sữa"` | Lưới sản phẩm chỉ hiển thị các món chứa từ khóa tương ứng |
| **TC-CAT-UI-04** | Tìm kiếm sản phẩm không dấu tiếng Việt | Nhập từ khóa `"ca phe sua"` hoặc `"tra dao"` | Hàm `removeVietnameseTones` chuẩn hóa và lọc chính xác các món liên quan |
| **TC-CAT-UI-05** | Lọc theo tab danh mục | Bấm chọn tab danh mục (ví dụ: *"Trà Trái Cây"*) | Chỉ hiển thị các sản phẩm có `categoryName === "Trà Trái Cây"` |
| **TC-CAT-UI-06** | Tab gom nhóm món không danh mục | Có sản phẩm có `categoryName === null` | Sản phẩm được hiển thị dưới Tab danh mục `"Khác"` |
| **TC-CAT-UI-07** | Số lượng đếm món trên tab danh mục | Danh sách tải về có số lượng từng loại | Nhãn tab hiển thị đúng số lượng món (ví dụ: *"Cà phê (5)"*, *"Tất cả (12)"*) |
| **TC-CAT-UI-08** | Tìm kiếm không có kết quả | Nhập từ khóa không tồn tại (ví dụ: `"xyz123"`) | Hiển thị giao diện `<NoResultsState />` kèm nút *"Xóa bộ lọc"* |
| **TC-CAT-UI-09** | Bấm nút "Xóa bộ lọc" | Người dùng bấm *"Xóa bộ lọc"* khi không có kết quả | Ô tìm kiếm được xóa trắng, tab danh mục chuyển về *"Tất cả"*, danh sách menu phục hồi |
| **TC-CAT-UI-10** | Xử lý lỗi API phía client | API trả về 500 hoặc mất kết nối mạng | Hiển thị màn hình thông báo lỗi `<MenuErrorState />` kèm nút *"Thử lại"* |
| **TC-CAT-UI-11** | Cơ chế bấm "Thử lại" sau lỗi | Bấm nút *"Thử lại"* trên `<MenuErrorState />` | Kích hoạt gọi lại hàm `retry() -> loadData()`, nếu mạng đã có thì hiển thị lại menu |
| **TC-CAT-UI-12** | Hiển thị nút giỏ hàng nổi | Giỏ hàng có sản phẩm (`badgeCount > 0`) | Nút `<FloatingCartButton />` hiển thị nổi ở góc màn hình kèm số lượng ly và tổng tiền tạm tính |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Tiêu chuẩn dữ liệu:** Toàn bộ sản phẩm mở bán được hiển thị đầy đủ, không để lộ trường tồn kho `stock` ra ngoài API.
- **Tiêu chuẩn tìm kiếm:** Người dùng có thể tìm thấy món bất kể gõ chữ hoa, chữ thường hay tiếng Việt không dấu.
- **Tính phản hồi:** Đầy đủ 4 trạng thái giao diện: Loading (`ProductSkeleton`), Thành công (`ProductList`), Không kết quả (`NoResultsState`), và Lỗi mạng (`MenuErrorState`).

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-12):** Thiết lập danh mục test case sơ bộ cho Menu.
- **v1.1 (2026-10-25):** Chuẩn hóa test case theo quyết định loại bỏ param tìm kiếm server-side, chuyển sang lọc client-side tối ưu hiệu năng và bảo mật trường tồn kho.
