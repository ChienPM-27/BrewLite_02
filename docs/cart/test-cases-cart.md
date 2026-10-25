# Test Cases: Cart (Quản lý giỏ hàng)

> **Feature:** Cart (Giỏ hàng) | **Owner:** Cart Team | **Phiên bản:** v1.0  
> **Phạm vi kiểm thử:** Phân hệ Giỏ hàng được quản lý hoàn toàn ở phía Frontend bằng **Zustand State Management** kết hợp lưu trữ cục bộ **localStorage** (`brewlite_cart`). Toàn bộ kiểm thử tập trung vào tính toàn vẹn của Store, quy tắc tính toán tài chính, đồng bộ dữ liệu sau khi tải lại trang, và tương tác giao diện người dùng trên trang `/cart`.

---

## 1. PHẠM VI & MỤC TIÊU KIỂM THỬ

1. **Khóa dòng sản phẩm duy nhất (Cart Item Signature Key):**
   - Đảm bảo mỗi dòng sản phẩm có ID sinh từ quy tắc: `${productId}-${size}-${toppingIds.sort().join('-')}`.
   - Phân biệt chính xác giữa 2 ly cùng loại, cùng size nhưng khác Topping.
2. **Gộp dòng sản phẩm trùng lặp (Merge Duplicates):**
   - Khi thêm một món có cùng sản phẩm, cùng size và cùng danh sách topping, số lượng tự động cộng dồn thay vì tạo dòng mới.
3. **Giới hạn số lượng (Quantity Constraints - Quyết định D5):**
   - Số lượng mỗi dòng luôn nằm trong khoảng từ 1 đến 99 (`MAX_QUANTITY_PER_LINE = 99`).
   - Giảm số lượng về 0 hoặc số âm sẽ tự động xóa dòng sản phẩm khỏi giỏ hàng.
4. **Tính toán tổng tiền & Badge:**
   - Tính toán chính xác `lineTotal = estimatedUnitPrice * quantity` cho từng dòng.
   - Tính toán chính xác `totalAmount = Σ lineTotal` và `badgeCount = Σ quantity`.
5. **Lưu trữ bền vững (Persistence & Hydration):**
   - Trạng thái giỏ hàng được lưu tự động vào `localStorage` dưới khóa `brewlite_cart`.
   - Khi người dùng tải lại trang (F5) hoặc mở tab mới, giỏ hàng được phục hồi nguyên vẹn và không gây lỗi Hydration mismatch của Next.js (nhờ hook `useHydrated`).
6. **Bảo toàn giỏ hàng theo quyết định D2:**
   - Giỏ hàng chỉ được làm rỗng (`clearCart()`) khi đơn hàng đã thanh toán thành công (`PAID`).
   - Nếu thanh toán thất bại (`PAYMENT_FAILED`) hoặc thoát ra ngoài, giỏ hàng phải được giữ nguyên.

---

## 2. DANH MỤC TEST CASES

### 2.1 Zustand Store Unit Tests (`useCartStore`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Hành động / Dữ liệu đầu vào | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-CART-01** | Thêm món mới vào giỏ hàng trống | Giỏ hàng rỗng (`items = []`, `badgeCount = 0`, `totalAmount = 0`) | Gọi `addItem()` với 1 ly Cà phê sữa (Size M, 0 topping, qty: 1) | `items.length = 1`, `badgeCount = 1`, `totalAmount` bằng đúng đơn giá của ly | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-02** | Thêm món mới khác topping | Giỏ hàng có sẵn 1 ly Cà phê sữa (Size M, 0 topping, qty: 1) | Thêm tiếp 1 ly Cà phê sữa (Size M, có Trân châu trắng, qty: 1) | `items.length = 2` (tạo thành 2 dòng riêng biệt do ID dòng khác nhau), `badgeCount = 2` | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-03** | Gộp dòng món hoàn toàn trùng khớp | Giỏ hàng có sẵn 1 ly Cà phê sữa (Size M, 0 topping, qty: 1) | Thêm tiếp 1 ly Cà phê sữa (Size M, 0 topping, qty: 2) | `items.length = 2` (không sinh dòng mới), dòng thứ nhất được cộng dồn `quantity = 1 + 2 = 3` | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-04** | Tăng số lượng dòng món | Giỏ hàng có ít nhất 1 dòng món (`quantity = 1`) | Gọi `updateQuantity(cartItemId, 5)` | Dòng món cập nhật `quantity = 5`, `badgeCount` và `totalAmount` tự động tính lại chuẩn xác | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-05** | Giới hạn số lượng tối đa 99 (D5) | Giỏ hàng có ít nhất 1 dòng món | Gọi `updateQuantity(cartItemId, 150)` | Số lượng bị chặn trần ở mức 99 (`MAX_QUANTITY_PER_LINE = 99`) | Biên | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-06** | Tự động xóa dòng khi số lượng $\le 0$ | Giỏ hàng có ít nhất 1 dòng món | Gọi `updateQuantity(cartItemId, 0)` hoặc `-1` | Dòng món bị xóa khỏi mảng `items`, `badgeCount` và `totalAmount` giảm tương ứng | Biên | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-07** | Xóa trực tiếp một dòng món | Giỏ hàng có ít nhất 1 dòng món | Gọi `removeItem(cartItemId)` | Dòng món bị loại bỏ ngay lập tức khỏi giỏ hàng | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-08** | Cập nhật tùy chọn qua `updateItem` | Giỏ hàng có sẵn món cần cập nhật | Đổi size S sang L hoặc đổi topping qua modal | ID dòng mới được tính lại; nếu ID mới trùng với một dòng sẵn có thì gộp số lượng; nếu không trùng thì cập nhật tại chỗ | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-09** | Tính chuỗi signature giỏ hàng | Giỏ hàng có ít nhất 1 món | Gọi `computeCartSignature(items, promoCode)` | Trả về chuỗi hash đại diện duy nhất cho giỏ hàng; thay đổi số lượng, size, topping hoặc mã promo sẽ sinh signature khác | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-10** | Quản lý đơn hàng PENDING gắn với giỏ | Đã tạo đơn hàng thành công ở trạng thái `PENDING` | Gọi `setPendingOrder(orderId, signature)` | Lưu `pendingOrderId` và `pendingCartSignature` phục vụ kiểm tra tái sử dụng đơn khi thanh toán | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-11** | Làm rỗng giỏ hàng sau thanh toán | Đơn hàng hoàn tất thanh toán (`PAID`), giỏ hàng đang có món | Gọi `clearCart()` | `items: []`, `totalAmount: 0`, `badgeCount: 0`, `pendingOrderId: null` | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-12** | Lưu trữ và phục hồi từ localStorage | Trình duyệt hỗ trợ `localStorage`, giỏ hàng đã có dữ liệu | Cập nhật giỏ hàng $\rightarrow$ Giả lập reload trang | Dữ liệu trong `localStorage['brewlite_cart']` được đọc ra và nạp lại vào store đầy đủ | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |

---

### 2.2 Frontend UI & Tương tác Giỏ Hàng (`CartPage`)

| ID | Tình huống kiểm thử | Tiền điều kiện | Thao tác người dùng | Kết quả mong đợi | Loại | Use case liên quan | Endpoint liên quan | Trạng thái | Test tự động |
|---|---|---|---|---|---|---|---|---|---|
| **TC-CART-UI-01** | Hiển thị giỏ hàng trống | Giỏ hàng rỗng (`items = []`) | Truy cập `/cart` khi chưa chọn món nào | Hiển thị màn hình giỏ rỗng với tiêu đề *"Giỏ hàng của bạn đang trống"*, thông điệp *"Bạn chưa chọn món nào. Hãy ghé qua thực đơn để khám phá các dòng cà phê rang mộc và trà tươi mát nhé!"*, nút *"Khám phá thực đơn ngay"* dẫn về `/menu`, nút *"Tiến hành thanh toán"* không xuất hiện | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-02** | Hiển thị danh sách món trong giỏ | Giỏ hàng có 2 món khác nhau | Truy cập trang `/cart` | Hiển thị tiêu đề *"Món đã chọn (2)"*, nút *"Xóa tất cả"*. Danh sách món hiển thị hình ảnh, tên món, nhãn `Size <S/M/L>`, danh sách topping, nút *"Đổi Size / Topping"*, bộ đếm số lượng, thành tiền, nút xóa (thùng rác). Bên phải hiển thị card *"Tóm tắt đơn hàng"*, ô *"Nhập mã ưu đãi (VD: BREWLITE)"*, bảng kê tạm tính, *"Lấy tại quầy (Miễn phí)"*, *"Tổng cộng:"* và nút *"Tiến hành thanh toán"* | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-03** | Bấm tăng/giảm trên giao diện | Giỏ hàng có ít nhất 1 món trên trang `/cart` | Bấm nút `+` hoặc `-` tại bộ đếm số lượng của dòng món | Số lượng và thành tiền cập nhật tức thì trên UI, không bị giật lag; tổng tiền đơn hàng tự động tính lại | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-04** | Bấm nút xóa món (Biểu tượng thùng rác) | Giỏ hàng có ít nhất 1 món trên trang `/cart` | Bấm biểu tượng thùng rác (`aria-label="Xóa <tên_món>"`) tại một dòng | Dòng món bị xóa ngay lập tức khỏi giỏ hàng; danh sách cập nhật trực tiếp; số lượng món trên badge (`badgeCount`) và tổng tiền (`totalAmount`) được tính toán lại; không hiển thị thông báo toast | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-05** | Mở Modal tùy chỉnh lại món | Giỏ hàng có ít nhất 1 món trên trang `/cart` | Bấm nút *"Đổi Size / Topping"* trên một dòng món | Mở `<EditCartItemModal />`, hiển thị đúng size và topping hiện tại của dòng đó, lưu ý *"Topping sẽ được cập nhật và tính lại tổng tiền ngay trong giỏ hàng."* | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-06** | Lưu thay đổi từ Modal | Modal `<EditCartItemModal />` đang mở | Thay đổi size hoặc topping và bấm nút *"Lưu thay đổi"* | Modal đóng lại; dòng món cập nhật thông tin mới trên bảng giỏ hàng; hiển thị Toast thông báo với tiêu đề *"Giỏ hàng đã cập nhật!"* và nội dung mô tả chi tiết | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-07** | Nhập mã khuyến mãi | Người dùng đang ở trang `/cart` | Nhập mã (ví dụ: `"WELCOME10"`) vào ô *"Nhập mã ưu đãi (VD: BREWLITE)"* | Mã được lưu vào state `promoCode` của trang | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-08** | Chuyển sang trang thanh toán có mã | Giỏ hàng có món, ô mã ưu đãi đã nhập `"WELCOME10"` | Bấm nút *"Tiến hành thanh toán"* | Chuyển hướng người dùng sang trang `/checkout?promo=WELCOME10` | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-09** | Chuyển sang trang thanh toán không có mã | Giỏ hàng có món, ô mã ưu đãi để trống | Bấm nút *"Tiến hành thanh toán"* | Chuyển hướng người dùng sang trang `/checkout` | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |
| **TC-CART-UI-10** | Tránh lỗi Hydration Mismatch | Người dùng có giỏ hàng trong localStorage mở trang `/cart` | Truy cập trực tiếp URL `/cart` hoặc reload trang (F5) | Hook `useHydrated()` render khung xương skeleton đồng nhất trước khi client mount dữ liệu thật, không gây lỗi Hydration mismatch console | Hợp lệ | UC-CART-01 | FE-only | Chưa chạy | - |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Tính toàn vẹn giỏ hàng:** Dữ liệu trong giỏ không bao giờ bị mất ngẫu nhiên khi người dùng F5 tải lại trang.
- **Tính chính xác tài chính:** Tổng tiền tạm tính `totalAmount` luôn bằng tổng các `lineTotal`.
- **Nguyên tắc bảo vệ giỏ hàng:** Tuyệt đối không làm rỗng giỏ hàng nếu đơn hàng chưa ở trạng thái `PAID`.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-25):** Thiết lập danh mục test cases cho Giỏ hàng (Zustand Store & UI `/cart`), quy chuẩn hóa các cột metadata và đối chiếu nguyên văn chuỗi giao diện.
