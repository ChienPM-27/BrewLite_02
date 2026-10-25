# Test Cases: Cart (Quản lý giỏ hàng)

> **Feature:** Cart (Giỏ hàng) | **Owner:** Cart Team | **Phiên bản:** v1.1  
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

| ID | Tình huống kiểm thử | Hành động / Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| **TC-CART-01** | Thêm món mới vào giỏ hàng trống | Gọi `addItem()` với 1 ly Cà phê sữa (Size M, 0 topping, qty: 1) | `items.length = 1`, `badgeCount = 1`, `totalAmount` bằng đúng đơn giá của ly |
| **TC-CART-02** | Thêm món mới khác topping | Thêm tiếp 1 ly Cà phê sữa (Size M, có Trân châu trắng, qty: 1) | `items.length = 2` (tạo thành 2 dòng riêng biệt do ID dòng khác nhau), `badgeCount = 2` |
| **TC-CART-03** | Gộp dòng món hoàn toàn trùng khớp | Thêm tiếp 1 ly Cà phê sữa (Size M, 0 topping, qty: 2) | `items.length = 2` (không sinh dòng mới), dòng thứ nhất được cộng dồn `quantity = 1 + 2 = 3` |
| **TC-CART-04** | Tăng số lượng dòng món | Gọi `updateQuantity(cartItemId, 5)` | Dòng món cập nhật `quantity = 5`, `badgeCount` và `totalAmount` tự động tính lại chuẩn xác |
| **TC-CART-05** | Giới hạn số lượng tối đa 99 (D5) | Gọi `updateQuantity(cartItemId, 150)` | Số lượng bị chặn trần ở mức 99 (`MAX_QUANTITY_PER_LINE = 99`) |
| **TC-CART-06** | Tự động xóa dòng khi số lượng $\le 0$ | Gọi `updateQuantity(cartItemId, 0)` hoặc `-1` | Dòng món bị xóa khỏi mảng `items`, `badgeCount` và `totalAmount` giảm tương ứng |
| **TC-CART-07** | Xóa trực tiếp một dòng món | Gọi `removeItem(cartItemId)` | Dòng món bị loại bỏ ngay lập tức khỏi giỏ hàng |
| **TC-CART-08** | Cập nhật tùy chọn qua `updateItem` | Đổi size S sang L hoặc đổi topping qua modal | ID dòng mới được tính lại; nếu ID mới trùng với một dòng sẵn có thì gộp số lượng; nếu không trùng thì cập nhật tại chỗ |
| **TC-CART-09** | Tính chuỗi signature giỏ hàng | Gọi `computeCartSignature(items, promoCode)` | Trả về chuỗi hash đại diện duy nhất cho giỏ hàng; thay đổi số lượng, size, topping hoặc mã promo sẽ sinh signature khác |
| **TC-CART-10** | Quản lý đơn hàng PENDING gắn với giỏ | Gọi `setPendingOrder(orderId, signature)` | Lưu `pendingOrderId` và `pendingCartSignature` phục vụ kiểm tra tái sử dụng đơn khi thanh toán |
| **TC-CART-11** | Làm rỗng giỏ hàng sau thanh toán | Gọi `clearCart()` | `items: []`, `totalAmount: 0`, `badgeCount: 0`, `pendingOrderId: null` |
| **TC-CART-12** | Lưu trữ và phục hồi từ localStorage | Cập nhật giỏ hàng $\rightarrow$ Giả lập reload trang | Dữ liệu trong `localStorage['brewlite_cart']` được đọc ra và nạp lại vào store đầy đủ |

---

### 2.2 Frontend UI & Tương tác Giỏ Hàng (`CartPage`)

| ID | Tình huống kiểm thử | Thao tác người dùng | Kết quả mong đợi |
|---|---|---|---|
| **TC-CART-UI-01** | Hiển thị giỏ hàng trống | Truy cập `/cart` khi chưa chọn món nào | Hiển thị màn hình giỏ rỗng, thông báo *"Giỏ hàng của bạn đang trống"*, nút đặt hàng bị ẩn, có link *"Khám phá thực đơn"* |
| **TC-CART-UI-02** | Hiển thị danh sách món trong giỏ | Giỏ có 2 món khác nhau | Hiển thị chi tiết từng món: hình ảnh, tên món, nhãn Size (S/M/L), danh sách Topping, đơn giá, bộ đếm số lượng, và thành tiền dòng |
| **TC-CART-UI-03** | Bấm tăng/giảm trên giao diện | Bấm nút `+` hoặc `-` tại một dòng món | Số lượng và thành tiền cập nhật tức thì trên UI, không bị giật lag |
| **TC-CART-UI-04** | Bấm nút xóa món (Biểu tượng thùng rác) | Bấm biểu tượng thùng rác tại một dòng | Dòng món biến mất khỏi danh sách, hiển thị Toast thông báo: *"Đã xóa sản phẩm khỏi giỏ"* |
| **TC-CART-UI-05** | Mở Modal tùy chỉnh lại món | Bấm nút *"Tùy chỉnh"* trên một dòng món | Mở `<EditCartItemModal />`, hiển thị đúng size và topping hiện tại của dòng đó |
| **TC-CART-UI-06** | Lưu thay đổi từ Modal | Thay đổi size trong modal và bấm *"Lưu thay đổi"* | Modal đóng lại, dòng món cập nhật thông tin mới trên bảng giỏ hàng |
| **TC-CART-UI-07** | Nhập mã khuyến mãi | Nhập mã (ví dụ: `"WELCOME10"`) vào ô mã giảm giá | Mã được lưu vào state `promoCode` |
| **TC-CART-UI-08** | Chuyển sang trang thanh toán có mã | Nhập mã `"WELCOME10"` và bấm *"Tiến hành đặt hàng"* | Chuyển hướng sang trang `/checkout?promo=WELCOME10` |
| **TC-CART-UI-09** | Chuyển sang trang thanh toán không có mã | Bỏ trống ô mã và bấm *"Tiến hành đặt hàng"* | Chuyển hướng sang trang `/checkout` |
| **TC-CART-UI-10** | Tránh lỗi Hydration Mismatch | Người dùng có giỏ hàng trong localStorage mở trang `/cart` | Hook `useHydrated()` đảm bảo server render skeleton đồng nhất trước khi client mount dữ liệu thật |

---

## 3. ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE CRITERIA)

- **Tính toàn vẹn giỏ hàng:** Dữ liệu trong giỏ không bao giờ bị mất ngẫu nhiên khi người dùng F5 tải lại trang.
- **Tính chính xác tài chính:** Tổng tiền tạm tính `totalAmount` luôn bằng tổng các `lineTotal`.
- **Nguyên tắc bảo vệ giỏ hàng:** Tuyệt đối không làm rỗng giỏ hàng nếu đơn hàng chưa ở trạng thái `PAID`.

---

## 4. LỊCH SỬ THAY ĐỔI

- **v1.0 (2026-10-12):** Thiết lập kiểm thử ban đầu cho giỏ hàng.
- **v1.1 (2026-10-25):** Bổ sung test case kiểm tra cơ chế Signature giỏ hàng, giới hạn 99 ly (D5) và chống lỗi Hydration của Next.js.
