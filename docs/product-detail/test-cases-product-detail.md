# Test Cases: Product Detail (Chi tiết sản phẩm & Tùy chọn)

> **Feature:** Product Detail | **Owner:** Vũ Hoàng Huy | **Phiên bản:** v1.0  
> **Phạm vi kiểm thử:** Kiểm thử API `GET /api/v1/products/:id` phía Backend NestJS, logic validate ID, nạp danh sách size và topping, tính toán giá realtime và thêm vào giỏ hàng phía Frontend (`useProductDetail`, `ProductDetailView`).

---

## 1. PHẠM VI & MỤC TIÊU KIỂM THỬ

1. **Backend API (`GET /api/v1/products/:id`):**
   - Kiểm tra xác thực định dạng ID sản phẩm bằng Regex (`PRODUCT_ID_PATTERN`).
   - Kiểm tra trả về thông tin chi tiết một sản phẩm kèm danh sách phụ thu kích cỡ (`sizePrices`) và toàn bộ topping đang mở bán (`toppings`).
   - Kiểm tra xử lý trường hợp không tìm thấy sản phẩm (`404 Not Found`).
   - Kiểm tra xử lý trường hợp ID sai cú pháp (`400 Bad Request`).
2. **Frontend UI & Hook (`useProductDetail`, `ProductDetailView`):**
   - Kiểm thử chọn kích cỡ (S/M/L) và tự động cập nhật đơn giá theo phụ phí.
   - Kiểm thử chọn và hủy chọn topping, giới hạn tối đa 3 topping không trùng lặp (Quy tắc BR-CART-08).
   - Kiểm thử bộ tăng giảm số lượng (QuantityStepper) trong phạm vi từ 1 đến 99 (Quyết định D5).
   - Kiểm thử tính toán thành tiền tạm tính phía Client theo công thức chuẩn.
   - Kiểm thử hành động nhấn nút *"Thêm vào giỏ hàng"* (`addItem`), hiển thị Toast thông báo và cập nhật giỏ hàng.
   - Kiểm thử các trạng thái màn hình lỗi (Không tìm thấy món, ID sai, Lỗi mạng) kèm nút thử lại.

---

## 2. DANH MỤC TEST CASES

### 2.1 Backend API Tests (`GET /api/v1/products/:id`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-DET-01** | Lấy chi tiết sản phẩm thành công | CSDL có sản phẩm tồn tại | Gửi `GET /api/v1/products/:id` với ID hợp lệ và tồn tại trong DB | `200 OK`, trả về object `ProductDetailDto` với `id, name, basePrice, imageUrl, isAvailable, sizePrices, toppings` | Hợp lệ | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |
| **TC-DET-02** | Sản phẩm không tồn tại | ID đúng định dạng alphanumeric nhưng không có trong CSDL | Gửi `GET /api/v1/products/:id` với `id` không tồn tại | `404 Not Found`: `{ success: false, message: "Không tìm thấy sản phẩm với ID cung cấp" }` | Lỗi | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |
| **TC-DET-03** | ID sản phẩm sai định dạng | Không có | Gửi `GET /api/v1/products/:id` với `id` chứa ký tự đặc biệt vi phạm regex `^[A-Za-z0-9_-]{1,64}$` (ví dụ: `!@#$%^` hoặc rỗng hoặc dài > 64 ký tự) | `400 Bad Request`: `{ success: false, message: "ID sản phẩm không hợp lệ" }` | Lỗi | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |
| **TC-DET-04** | Bảng phụ thu kích cỡ được sắp xếp chuẩn | Sản phẩm có cấu hình phụ thu size trong CSDL | Gửi `GET /api/v1/products/:id` | Mảng `sizePrices` được sắp xếp theo phụ phí tăng dần (`priceAdjustment ASC`, `size ASC`) | Hợp lệ | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |
| **TC-DET-05** | Danh sách Topping chỉ nạp món khả dụng | CSDL có cả topping khả dụng và topping hết hàng (`stock = 0` hoặc `isAvailable = false`) | Gửi `GET /api/v1/products/:id` | Mảng `toppings` chỉ chứa các topping đang mở bán và còn hàng (`isAvailable = true` và `stock > 0`) | Hợp lệ | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |
| **TC-DET-06** | Ép kiểu dữ liệu Decimal chuẩn | Các trường giá tiền trong CSDL lưu `Decimal(12, 0)` | Gửi `GET /api/v1/products/:id` | Khi trả về API, `basePrice`, `priceAdjustment` và `price` topping đều là kiểu `Number` nguyên chẵn | Hợp lệ | UC-PROD-01 | GET /api/v1/products/:id | Chưa chạy | - |

---

### 2.2 Frontend UI & Hook Tests (`useProductDetail`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Thao tác người dùng / Dữ liệu | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-DET-UI-01** | Trạng thái đang tải chi tiết món | Người dùng mở URL `/products/:id` | Truy cập trang khi API chưa phản hồi | Hiển thị khung skeleton tải trang `<ProductDetailSkeleton />` (`aria-label="Đang tải chi tiết sản phẩm"`) | Hợp lệ | UC-PROD-01 | FE-only | Chưa chạy | - |
| **TC-DET-UI-02** | Tải trang chi tiết thành công | API phản hồi dữ liệu chi tiết sản phẩm hợp lệ | Trang hoàn tất nạp dữ liệu | Hiển thị thông tin món: ảnh, tên món, mô tả, các tùy chọn Size (S/M/L) và danh sách Topping | Hợp lệ | UC-PROD-01 | FE-only | Chưa chạy | - |
| **TC-DET-UI-03** | Mặc định chọn Size đầu tiên | Sản phẩm có danh sách `sizePrices` | Mới vào trang chi tiết | Tự động chọn size đầu tiên trong danh mục (thường là Size S, phụ thu +0đ) | Hợp lệ | UC-PROD-02 | FE-only | Chưa chạy | - |
| **TC-DET-UI-04** | Chuyển đổi Size sản phẩm | Sản phẩm có nhiều kích cỡ (S, M, L) | Người dùng chọn chuyển sang Size M hoặc Size L | Size được chọn kích hoạt viền nổi bật; đơn giá tự động cộng thêm phụ thu (ví dụ: Size M +5.000đ, Size L +10.000đ) | Hợp lệ | UC-PROD-02 | FE-only | Chưa chạy | - |
| **TC-DET-UI-05** | Chọn thêm Topping | Sản phẩm có danh sách topping | Bấm chọn 1 topping (ví dụ: Trân châu trắng +10.000đ) | Checkbox topping được đánh dấu; đơn giá tự động cộng thêm tiền topping; badge hiển thị `(Đã chọn 1/3 topping)` | Hợp lệ | UC-PROD-02 | FE-only | Chưa chạy | - |
| **TC-DET-UI-06** | Chọn tối đa 3 topping (BR-CART-08) | Đã chọn đủ 3 topping khác nhau trong danh sách | Người dùng cố gắng chọn thêm topping thứ 4 | Cả 3 topping đã chọn giữ nguyên; các topping còn lại bị vô hiệu hóa (`disabled`) và mờ đi, không cho chọn topping thứ 4 | Biên | UC-PROD-02 | FE-only | Chưa chạy | - |
| **TC-DET-UI-07** | Hủy chọn Topping đã chọn | Đang có ít nhất 1 topping được chọn | Bấm lại vào topping đang được chọn | Topping được bỏ chọn; đơn giá giảm tương ứng số tiền của topping đó; badge số lượng topping giảm | Hợp lệ | UC-PROD-02 | FE-only | Chưa chạy | - |
| **TC-DET-UI-08** | Tăng/giảm số lượng món | Người dùng đang ở trang chi tiết sản phẩm | Bấm nút `+` hoặc `-` trên bộ đếm số lượng `QuantityStepper` | Số lượng tăng/giảm trong khoảng 1 đến 99; tổng tiền cập nhật theo công thức `totalPrice = unitPrice * quantity` | Hợp lệ | UC-PROD-03 | FE-only | Chưa chạy | - |
| **TC-DET-UI-09** | Giới hạn số lượng tối thiểu và tối đa | Số lượng đang ở mức 1 hoặc 99 | Bấm giảm khi số lượng = 1, hoặc bấm tăng khi số lượng = 99 | Nút `-` bị vô hiệu hóa khi số lượng = 1; nút `+` bị vô hiệu hóa khi số lượng = 99 (Quyết định D5) | Biên | UC-PROD-03 | FE-only | Chưa chạy | - |
| **TC-DET-UI-10** | Thêm món vào giỏ hàng thành công | Đã chọn size hợp lệ, sản phẩm đang mở bán | Nhấn nút *"Thêm vào giỏ hàng"* (hoặc *"Thêm vào giỏ hàng – ...đ"*) | Gọi `addItem()` của `useCartStore`, hiển thị Toast thông báo với tiêu đề *"Đã thêm vào giỏ hàng!"*, icon giỏ hàng trên Header tăng badge | Hợp lệ | UC-PROD-04 | FE-only | Chưa chạy | - |
| **TC-DET-UI-11** | Chặn thêm vào giỏ khi chưa khả dụng | Sản phẩm có `isAvailable = false` (hoặc `unitPrice === null`) | Quan sát nút CTA ở chân trang chi tiết | Nút CTA hiển thị nhãn *"Sản phẩm không còn bán"* (hoặc *"Chưa thể thêm vào giỏ"*) và ở trạng thái vô hiệu hóa (`disabled`) | Biên | UC-PROD-03 | FE-only | Chưa chạy | - |
| **TC-DET-UI-12** | Xử lý lỗi không tìm thấy sản phẩm | URL chứa ID hợp lệ nhưng không tồn tại trong CSDL (API trả về 404) | Người dùng truy cập URL sản phẩm không tồn tại | Hiển thị giao diện `<ProductDetailErrorState />` với badge *"Lỗi 404"*, tiêu đề *"Không tìm thấy sản phẩm"*, mô tả *"Món bạn đang tìm có thể đã đổi tên, tạm gỡ khỏi thực đơn hoặc đường dẫn không còn tồn tại."* kèm nút *"Quay lại thực đơn"* | Lỗi | UC-PROD-01 | FE-only | Chưa chạy | - |
| **TC-DET-UI-13** | Xử lý lỗi ID sai định dạng | URL chứa ID sai định dạng regex (API trả về 400) | Người dùng truy cập URL với ID chứa ký tự đặc biệt | Hiển thị giao diện `<ProductDetailErrorState />` với badge *"Lỗi 400"*, tiêu đề *"Không thể mở sản phẩm"*, mô tả *"Đường dẫn sản phẩm không hợp lệ. Vui lòng chọn món từ thực đơn."* kèm nút *"Quay lại thực đơn"* | Lỗi | UC-PROD-01 | FE-only | Chưa chạy | - |
| **TC-DET-UI-14** | Xử lý lỗi kết nối hoặc 5xx | Máy chủ gặp sự cố hoặc mất mạng khi tải chi tiết món | Người dùng mở trang chi tiết sản phẩm | Hiển thị giao diện `<ProductDetailErrorState />` với badge *"Gián đoạn kết nối"*, tiêu đề *"Không thể tải sản phẩm"*, mô tả *"Đã xảy ra lỗi khi lấy thông tin món từ máy chủ. Vui lòng kiểm tra lại kết nối mạng và thử lại."* kèm nút *"Thử lại"* và nút *"Về thực đơn"* | Lỗi | UC-PROD-01 | FE-only | Chưa chạy | - |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Quy tắc kinh doanh Topping:** Giới hạn tối đa 3 topping mỗi ly, không cho phép chọn trùng topping.
- **Quy tắc số lượng:** Mỗi dòng món chỉ nhận số lượng từ 1 đến 99.
- **Tính toán tài chính:** Giá tạm tính hiển thị realtime luôn khớp chính xác với công thức: `totalPrice = (basePrice + sizePrice + Σ toppingPrice) × quantity`.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-25):** Thiết lập danh mục test cases cho Product Detail (`GET /api/v1/products/:id` & UI `/products/:id`), bổ sung các cột metadata và đối chiếu nguyên văn chuỗi giao diện (`"Quay lại thực đơn"`, `"Đã thêm vào giỏ hàng!"`).
