# Test Cases: Product Catalog (Thực đơn sản phẩm)

> **Feature:** Product Catalog | **Owner:** Đinh Nhật Lan | **Phiên bản:** v1.0  
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

| ID | Tình huống kiểm thử | Tiền điều kiện | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-CAT-01** | Lấy danh sách thực đơn thành công | CSDL có sản phẩm khả dụng (`isAvailable = true`, `stock > 0`) | Gửi `GET /api/v1/products` (không cần Authorization header) | `200 OK`, trả về mảng sản phẩm dạng JSON bọc qua `TransformInterceptor` (`success: true, statusCode: 200, data: [...]`) | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-02** | Lọc bỏ sản phẩm ngừng kinh doanh | CSDL có sản phẩm có `isAvailable = false` | Gửi `GET /api/v1/products` | Sản phẩm này tuyệt đối không xuất hiện trong mảng `data` trả về | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-03** | Lọc bỏ sản phẩm hết tồn kho | CSDL có sản phẩm có `stock = 0` hoặc `stock < 0` | Gửi `GET /api/v1/products` | Sản phẩm này không xuất hiện trong mảng `data` | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-04** | Kiểm tra bảo mật trường `stock` | CSDL có nhiều sản phẩm với số lượng tồn kho khác nhau | Gửi `GET /api/v1/products` và kiểm tra toàn bộ các object sản phẩm | Không có trường `stock` trong payload JSON trả về client | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-05** | Thứ tự sắp xếp mặc định | Nhiều sản phẩm thuộc các danh mục khác nhau trong CSDL | Gửi `GET /api/v1/products` | Danh sách được sắp xếp theo tên sản phẩm tăng dần (`name ASC`) | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-06** | Định dạng giá tiền Decimal sang Number | `basePrice` và `priceAdjustment` trong CSDL lưu `Decimal(12, 0)` | Gửi `GET /api/v1/products` | Khi trả về API, các giá trị này được ép kiểu sang kiểu số nguyên `Number` | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-07** | Sản phẩm có danh mục hợp lệ | Sản phẩm liên kết với một Category trong CSDL | Gửi `GET /api/v1/products` | Trường `categoryName` trả về đúng tên danh mục (ví dụ: `"Cà phê"`, `"Trà & Trái cây"`) | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-08** | Sản phẩm không có danh mục (`categoryId = null`) | Sản phẩm độc lập không gán category | Gửi `GET /api/v1/products` | Trường `categoryName` trả về giá trị `null` | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-09** | Nạp danh sách phụ thu kích cỡ | Sản phẩm có các size S, M, L trong `ProductSizePrice` | Gửi `GET /api/v1/products` | Mảng `sizePrices` trả về đầy đủ các kích cỡ kèm phụ phí tương ứng | Hợp lệ | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-10** | CSDL chưa có sản phẩm nào khả dụng | Bảng `products` rỗng hoặc toàn bộ `isAvailable = false` | Gửi `GET /api/v1/products` | `200 OK`, mảng `data: []` rỗng, không bị lỗi 500 | Biên | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |
| **TC-CAT-11** | Lỗi kết nối CSDL | Dịch vụ PostgreSQL gặp sự cố hoặc ngắt kết nối | Gửi `GET /api/v1/products` | Backend bắt lỗi qua `AllExceptionsFilter`, trả về `500 Internal Server Error` có cấu trúc chuẩn | Lỗi | UC-CAT-01 | GET /api/v1/products | Chưa chạy | - |

---

### 2.2 Frontend UI & Hook Tests (`useProductCatalog`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Thao tác người dùng / Dữ liệu | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-CAT-UI-01** | Trạng thái đang tải dữ liệu (Loading) | Người dùng mới truy cập trang `/menu` | Truy cập trang khi API chưa phản hồi | Hiển thị khung xương tải trang `<ProductSkeleton />` (lưới 6 card mẫu) | Hợp lệ | UC-CAT-01 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-02** | Hiển thị lưới thực đơn thành công | API `GET /api/v1/products` trả về 10 sản phẩm | Trang hoàn tất tải dữ liệu | Ẩn skeleton, hiển thị danh sách các thẻ `<ProductCard />` với ảnh, tên món, nhãn danh mục, giá từ và nút thêm nhanh | Hợp lệ | UC-CAT-01 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-03** | Tìm kiếm sản phẩm có dấu tiếng Việt | Thực đơn đã nạp dữ liệu từ seed | Nhập từ khóa `"Cà phê sữa"` vào ô tìm kiếm | Lưới sản phẩm chỉ hiển thị các món chứa từ khóa tương ứng | Hợp lệ | UC-CAT-02 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-04** | Tìm kiếm sản phẩm không dấu tiếng Việt | Thực đơn đã nạp dữ liệu từ seed | Nhập từ khóa `"ca phe sua"` hoặc `"tra dao"` | Hàm `removeVietnameseTones` chuẩn hóa và lọc chính xác các món liên quan (`"Cà phê sữa"` hoặc `"Trà đào"`) | Hợp lệ | UC-CAT-02 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-05** | Lọc theo tab danh mục | Thực đơn đã nạp dữ liệu từ seed | Bấm chọn tab danh mục `"Trà & Trái cây"` | Chỉ hiển thị 4 sản phẩm có `categoryName === "Trà & Trái cây"` | Hợp lệ | UC-CAT-03 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-06** | Tab gom nhóm món không danh mục | Có sản phẩm có `categoryName === null` | Quan sát thanh tab và bấm chọn tab `"Khác"` | Sản phẩm không có danh mục được hiển thị dưới Tab danh mục `"Khác"` | Hợp lệ | UC-CAT-03 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-07** | Số lượng đếm món trên tab danh mục | Cơ sở dữ liệu nạp dữ liệu mẫu từ `seed.ts` (6 món Cà phê, 4 món Trà & Trái cây, tổng 10 món) | Quan sát nhãn và badge số lượng trên thanh `CategoryTabs` | Tab `"Tất cả"` hiển thị badge `10`, tab `"Cà phê"` hiển thị badge `6`, tab `"Trà & Trái cây"` hiển thị badge `4` | Hợp lệ | UC-CAT-03 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-08** | Tìm kiếm không có kết quả | Đang mở trang `/menu` | Nhập từ khóa không tồn tại (ví dụ: `"xyz123"`) | Hiển thị giao diện `<NoResultsState />` với tiêu đề *"Không tìm thấy món phù hợp"* kèm nút *"Xóa bộ lọc"* | Hợp lệ | UC-CAT-02 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-09** | Bấm nút "Xóa bộ lọc" | Đang ở giao diện `<NoResultsState />` | Bấm nút *"Xóa bộ lọc"* | Ô tìm kiếm được xóa trắng (`searchKeyword = ''`), tab danh mục chọn lại *"Tất cả"*, danh sách menu phục hồi 10 món | Hợp lệ | UC-CAT-02 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-10** | Xử lý lỗi API phía client | API trả về 500 hoặc mất kết nối mạng | Người dùng truy cập trang `/menu` | Hiển thị màn hình thông báo lỗi `<MenuErrorState />` với tiêu đề *"Không thể tải thực đơn"*, mô tả *"Đã có lỗi xảy ra trong quá trình lấy danh sách sản phẩm. Vui lòng kiểm tra lại kết nối mạng."* kèm nút *"Thử lại"* | Lỗi | UC-CAT-01 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-11** | Cơ chế bấm "Thử lại" sau lỗi | Đang ở giao diện `<MenuErrorState />` | Bấm nút *"Thử lại"* | Kích hoạt gọi lại hàm `retry() -> loadData()`, nếu mạng/server đã phục hồi thì tải lại và hiển thị thực đơn bình thường | Hợp lệ | UC-CAT-01 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-12** | Hiển thị nút giỏ hàng nổi | Giỏ hàng có sản phẩm (`badgeCount > 0`) | Xem thực đơn trên trang `/menu` | Nút `<FloatingCartButton />` hiển thị nổi ở góc màn hình kèm số lượng ly và tổng tiền tạm tính | Hợp lệ | UC-CAT-01 | FE-only | Chưa chạy | - |
| **TC-CAT-UI-13** | Hiển thị khi quán chưa mở bán món nào | API phản hồi mảng rỗng `data: []` | Người dùng truy cập `/menu` | Hiển thị `<EmptyMenuState />` với tiêu đề *"Chưa có sản phẩm mở bán"* và thông điệp *"Hiện chưa có sản phẩm nào được mở bán. Vui lòng quay lại sau!"* | Biên | UC-CAT-01 | FE-only | Chưa chạy | - |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Tiêu chuẩn dữ liệu:** Toàn bộ sản phẩm mở bán được hiển thị đầy đủ, không để lộ trường tồn kho `stock` ra ngoài API.
- **Tiêu chuẩn tìm kiếm:** Người dùng có thể tìm thấy món bất kể gõ chữ hoa, chữ thường hay tiếng Việt không dấu.
- **Tính phản hồi:** Đầy đủ 4 trạng thái giao diện: Loading (`ProductSkeleton`), Thành công (`ProductList`), Không kết quả (`NoResultsState`), và Lỗi mạng (`MenuErrorState`).

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-25):** Thiết lập danh mục test cases cho Product Catalog (`GET /api/v1/products` & UI `/menu`), bổ sung các cột metadata và đối chiếu số lượng đếm với dữ liệu seed (6 cà phê, 4 trà, tổng 10).
