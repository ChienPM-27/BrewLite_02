# Test Cases: Product Detail (Chi tiết sản phẩm & Tùy chọn)

> **Feature:** Product Detail | **Owner:** Vũ Hoàng Huy | **Phiên bản:** v1.1  
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

| ID | Tình huống kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-DET-01** | Lấy chi tiết sản phẩm thành công | Gửi `GET /api/v1/products/:id` với ID hợp lệ và tồn tại trong DB | `200 OK`, trả về object `ProductDetailDto` với `id, name, basePrice, imageUrl, isAvailable, sizePrices, toppings` |
| **TC-DET-02** | Sản phẩm không tồn tại | `id` đúng định dạng nhưng không có trong bảng `products` | `404 Not Found`: `{ success: false, message: "Không tìm thấy sản phẩm với ID cung cấp" }` |
| **TC-DET-03** | ID sản phẩm sai định dạng | `id` chứa ký tự đặc biệt không hợp lệ (ví dụ: `id = "!@#$%^"`, `id = ""` hoặc dài quá 64 ký tự) | `400 Bad Request`: `{ success: false, message: "ID sản phẩm không hợp lệ" }` |
| **TC-DET-04** | Bảng phụ thu kích cỡ được sắp xếp chuẩn | Sản phẩm có cấu hình phụ thu size | Mảng `sizePrices` được sắp xếp theo phụ phí tăng dần (`priceAdjustment ASC`) |
| **TC-DET-05** | Danh sách Topping chỉ nạp món khả dụng | DB có topping còn hàng và topping hết hàng (`stock = 0` hoặc `isAvailable = false`) | Mảng `toppings` chỉ chứa các topping đang mở bán và còn hàng (`isAvailable = true` và `stock > 0`) |
| **TC-DET-06** | Ép kiểu dữ liệu Decimal chuẩn | Các trường giá tiền trong CSDL lưu `Decimal(12, 0)` | Khi trả về API, `basePrice`, `priceAdjustment` và `price` topping đều là kiểu `Number` nguyên chẵn |

---

### 2.2 Frontend UI & Hook Tests (`useProductDetail`)

| ID | Tình huống kiểm thử | Thao tác người dùng / Dữ liệu | Kết quả mong đợi |
|---|---|---|---|
| **TC-DET-UI-01** | Trạng thái đang tải chi tiết món | Người dùng mở trang `/products/:id` | Hiển thị khung skeleton tải trang `<ProductDetailSkeleton />` |
| **TC-DET-UI-02** | Tải trang chi tiết thành công | Nhận dữ liệu thành công từ API | Hiển thị thông tin món: ảnh lớn, tên món, mô tả, các tùy chọn Size (S/M/L) và danh sách Topping |
| **TC-DET-UI-03** | Mặc định chọn Size đầu tiên | Mới vào trang chi tiết | Tự động chọn size đầu tiên trong danh mục (thường là Size S, phụ thu +0đ) |
| **TC-DET-UI-04** | Chuyển đổi Size sản phẩm | Người dùng chọn chuyển sang Size M hoặc Size L | Size được chọn kích hoạt viền nổi bật; đơn giá tự động cộng thêm phụ thu (ví dụ: Size M +5.000đ, Size L +10.000đ) |
| **TC-DET-UI-05** | Chọn thêm Topping | Bấm chọn 1 topping (ví dụ: Trân châu trắng +10.000đ) | Checkbox topping được đánh dấu; đơn giá tự động cộng thêm tiền topping |
| **TC-DET-UI-06** | Chọn tối đa 3 topping (BR-CART-08) | Người dùng chọn đủ 3 topping khác nhau | Cả 3 topping đều được chọn; các topping còn lại bị làm mờ hoặc vô hiệu hóa, không cho chọn topping thứ 4 |
| **TC-DET-UI-07** | Hủy chọn Topping đã chọn | Bấm lại vào topping đang được chọn | Topping được bỏ chọn; đơn giá giảm tương ứng số tiền của topping đó |
| **TC-DET-UI-08** | Tăng/giảm số lượng món | Bấm nút `+` hoặc `-` trên bộ đếm số lượng | Số lượng tăng/giảm trong khoảng 1 đến 99; tổng tiền cập nhật theo công thức `totalPrice = unitPrice * quantity` |
| **TC-DET-UI-09** | Giới hạn số lượng tối thiểu và tối đa | Thử bấm giảm khi số lượng = 1, hoặc tăng khi số lượng = 99 | Nút `-` bị vô hiệu hóa ở mức 1; nút `+` bị vô hiệu hóa ở mức 99 (Quyết định D5) |
| **TC-DET-UI-10** | Thêm món vào giỏ hàng thành công | Nhấn nút *"Thêm vào giỏ hàng"* | Gọi `addItem()` của `useCartStore`, hiển thị Toast thông báo: *"Đã thêm vào giỏ hàng!"*, icon giỏ hàng tăng badge |
| **TC-DET-UI-11** | Chặn thêm vào giỏ khi chưa chọn size | Chưa hoàn tất tải cấu hình size | Nút *"Thêm vào giỏ"* ở trạng thái vô hiệu hóa (`disabled`) |
| **TC-DET-UI-12** | Xử lý lỗi không tìm thấy sản phẩm | URL chứa ID không tồn tại (API trả về 404) | Hiển thị giao diện `<ProductDetailErrorState />`: *"Không tìm thấy sản phẩm"* kèm nút *"Quay lại Menu"* |
| **TC-DET-UI-13** | Xử lý lỗi ID sai hoặc lỗi mạng | URL chứa ID sai hoặc mạng chập chờn | Hiển thị giao diện báo lỗi kèm nút *"Thử lại"* (`retry()`) |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Quy tắc kinh doanh Topping:** Giới hạn tối đa 3 topping mỗi ly, không cho phép chọn trùng topping.
- **Quy tắc số lượng:** Mỗi dòng món chỉ nhận số lượng từ 1 đến 99.
- **Tính toán tài chính:** Giá tạm tính hiển thị realtime luôn khớp chính xác với công thức: `totalPrice = (basePrice + sizePrice + Σ toppingPrice) × quantity`.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-12):** Khởi tạo danh mục test case cho chi tiết món.
- **v1.1 (2026-10-25):** Đồng bộ hóa các quy tắc DTO Regex, giới hạn 3 topping và số lượng tối đa 99 ly.
