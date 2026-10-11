# 🔐 ĐẶC TẢ USE CASE MENU SẢN PHẨM (PRODUCT CATALOG)
### Tác giả: Đinh Nhật Lan (Owner Feature: Product Catalog)
**Dự án:** BrewLite – Hệ Thống Đặt Cà Phê Không Dùng Tiền Mặt  
**Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – 2026–2027  
**Phạm vi:** Đáp ứng Task 6 (Menu sản phẩm): Đặc tả chức năng xem menu, chức năng tìm kiếm và lọc sản phẩm 

---

## 1. TỔNG QUAN PHÂN HỆ (MODULE OVERVIEW)
Phân hệ Danh mục sản phẩm (Product Catalog) chịu trách nhiệm cung cấp danh sách đồ uống để khách hàng xem menu, tìm kiếm và lọc sản phẩm theo các tiêu chí được hệ thống hỗ trợ. Phân hệ lấy dữ liệu sản phẩm từ Backend thông qua API và hiển thị thông tin tương ứng trên giao diện người dùng.

* **Các ca sử dụng cốt lõi:**
  1. **`UC-CAT-01`**: Xem menu sản phẩm (View Menu).
  2. **`UC-CAT-02`**: Tìm kiếm sản phẩm (Search Products)
  3. **`UC-CAT-03`**: Lọc sản phẩm theo danh mục 

---

## 2. BẢNG ĐẶC TẢ CHI TIẾT (USE CASE SPECIFICATIONS)

### 📄 UC-CAT-01: XEM MENU SẢN PHẨM (VIEW MENU)

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-CAT-01` |
| **Tên Use Case** | Xem menu sản phẩm |
| **Actor chính** | Khách hàng (Customer) |
| **Mục đích** | Xem danh sách sản phẩm đang được mở bán |
| **Điều kiện tiên quyết (Pre-condition)** | Người dùng đang mở ứng dụng web BrewLite |
| **Điều kiện kết thúc (Post-condition)** | Danh sách sản phẩm phù hợp được hiển thị trên giao diện |

#### Luồng sự kiện chính (Main Flow - Happy Path):
1. Khách hàng truy cập trang chủ và chọn chức năng **Khám phá thực đơn**.\
2. Hệ thống điều hướng đến trang Menu.
3. Frontend hiển thị trạng thái tải dữ liệu.
4. Frontend gửi yêu cầu lấy danh sách sản phẩm đến Backend.
5. Backend nhận yêu cầu và truy vấn dữ liệu sản phẩm trong cơ sở dữ liệu.
6. Backend trả về danh sách sản phẩm theo hợp đồng API đã thống nhất.
7. Frontend nhận dữ liệu và hiển thị danh sách sản phẩm bằng các Product Card.
8. Khách hàng xem thông tin sản phẩm trên menu.

#### Các luồng thay thế & ngoại lệ (Alternative & Exception Flows):
* **A1: Không có sản phẩm**
  Tại bước 6, nếu Backend trả về danh sách rỗng, Frontend hiển thị trạng thái chưa có sản phẩm thay vì danh sách Product Card.
* **E1 – Lỗi tải dữ liệu:**
  Tại bước 4 hoặc bước 5, yêu cầu lấy dữ liệu thất bại hoặc Backend không phản hồi, Frontend hiển thị thông báo lỗi kèm nút thử lại.

---

### 📄 UC-CAT-02: Tìm kiếm sản phẩm (Search Products)

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-CAT-02` |
| **Tên Use Case** | Tìm kiếm sản phẩm (Search Products) |
| **Actor chính** | Khách hàng (Customer) |
| **Mục đích** | Giúp khách hàng tìm nhanh sản phẩm theo tên. |
| **Pre-condition** | Khách hàng đang ở trang Menu và danh sách sản phẩm đã được tải thành công. |
| **Post-condition** | Danh sách sản phẩm được cập nhật theo từ khóa tìm kiếm. |

#### Luồng sự kiện chính (Main Flow):
1. Khách hàng truy cập trang Menu.
2. Khách hàng nhập tên hoặc một phần tên sản phẩm vào ô tìm kiếm và nhấn nút.
3. Frontend tiếp nhận từ khóa tìm kiếm.
4. Hệ thống chuẩn hóa từ khóa bằng cách loại bỏ khoảng trắng thừa và không phân biệt chữ hoa, chữ thường.
5. Frontend đối chiếu từ khóa với tên các sản phẩm đã tải.
6. Hệ thống hiển thị danh sách sản phẩm có tên phù hợp với từ khóa.
7. Khách hàng xem kết quả tìm kiếm.

#### Các luồng thay thế & ngoại lệ (Alternative & Exception Flows):
* **A1: Không tìm thấy sản phẩm phù hợp**
  * Tại bước 5, hệ thống không tìm thấy sản phẩm nào phù hợp với từ khóa, Frontend hiển thị thông báo không tìm thấy sản phẩm phù hợp, khách hàng có thể thay đổi từ khóa để tìm kiếm lại.
* **A2: Từ khóa tìm kiếm rỗng**
  * Tại bước 2, khách hàng xóa toàn bộ từ khóa tìm kiếm, Frontend hiển thị lại danh sách sản phẩm ban đầu.

---

### 📄 UC-CAT-03: Lọc sản phẩm theo danh mục (Filter Products by Category)

| Thuộc tính | Chi tiết đặc tả |
| :--- | :--- |
| **Mã Use Case** | `UC-CAT-03` |
| **Tên Use Case** | Lọc sản phẩm theo danh mục (Filter Products by Category) |
| **Actor** | Khách hàng |
| **Mục đích** | Giúp khách hàng xem các sản phẩm thuộc danh mục mong muốn. |
| **Pre-condition** | Khách hàng đang ở trang Menu và danh sách sản phẩm đã được tải thành công. |
| **Post-condition** | Danh sách sản phẩm được cập nhật theo danh mục được chọn. |

#### Luồng sự kiện chính (Main Flow):
1. Khách hàng chọn một danh mục.
2. Frontend tiếp nhận danh mục được chọn.
3. Hệ thống đối chiếu danh mục được chọn với trường danh mục của từng sản phẩm.
4. Frontend lọc danh sách và chỉ giữ lại các sản phẩm thuộc danh mục đã chọn.
5. Hệ thống hiển thị danh sách sản phẩm phù hợp.
6. Khách hàng xem các sản phẩm trong danh mục.

#### Các luồng thay thế & ngoại lệ (Alternative & Exception Flows):
* **A1: Không có sản phẩm thuộc danh mục được chọn**
  * Tại bước 5, khi hệ thống không tìm thấy sản phẩm nào thuộc danh mục được chọn, Frontend hiển thị thông báo chưa có sản phẩm trong danh mục này, khách hàng có thể chọn danh mục khác.
* **A2: Khách hàng chọn “Tất cả”**
  * Tại bước 3, khách hàng chọn danh mục “Tất cả”, Frontend loại bỏ điều kiện lọc danh mục và hiển toàn bộ sản phẩm phù hợp với từ khóa tìm kiếm nếu có.

---

## 3. QUY TẮC NGHIỆP VỤ & BẢO MẬT (BUSINESS RULES)

1. **BR-CAT-01:** Chỉ hiển thị các sản phẩm có trạng thái mở bán (isAvailable = true).
2. **BR-CAT-02:** Danh sách sản phẩm mặc định được sắp xếp theo tên tăng dần.
3. **BR-CAT-03:** Tìm kiếm sản phẩm dựa trên tên sản phẩm, không phân biệt chữ hoa và chữ thường.
4. **BR-CAT-04:** Lọc danh mục dựa trên danh mục của sản phẩm (categoryName).
5. **BR-CAT-05:** Khi không có kết quả tìm kiếm hoặc lọc, hệ thống phải hiển thị trạng thái danh sách trống phù hợp.
6. **BR-CAT-06:** Khi API tải dữ liệu thất bại, hệ thống phải thông báo lỗi và cho phép thử lại.
7. **BR-CAT-07:** Khi chọn “Tất cả”, hệ thống bỏ điều kiện lọc danh mục nhưng vẫn giữ từ khóa tìm kiếm hiện tại.

---

## 4.TIÊU CHÍ CHẤP NHẬN (ACCEPTANCE CRITERIA)
### AC-CAT-01: Hiển thị danh sách sản phẩm
* Điều kiện: Khách hàng truy cập trang Menu.
* Hành động: Hệ thống gửi yêu cầu lấy danh sách sản phẩm và nhận được phản hồi thành công từ API.
* Kết quả mong đợi: 
Hệ thống hiển thị danh sách sản phẩm được trả về trong trường data.
Mỗi sản phẩm được hiển thị dưới dạng thẻ sản phẩm, bao gồm các thông tin tương ứng với dữ liệu API.
Chỉ hiển thị các sản phẩm có trạng thái mở bán (isAvailable = true).
Danh sách sản phẩm được sắp xếp theo tên tăng dần.

### AC-CAT-02: Tìm kiếm sản phẩm theo tên
* Điều kiện: Danh sách sản phẩm đã được tải thành công.
* Hành động: Khách hàng nhập tên hoặc một phần tên sản phẩm vào ô tìm kiếm.
* Kết quả mong đợi:
Hệ thống hiển thị các sản phẩm có tên chứa từ khóa tìm kiếm.
Việc tìm kiếm không phân biệt chữ hoa và chữ thường.
Khoảng trắng thừa ở đầu và cuối từ khóa được loại bỏ trước khi tìm kiếm.
Nếu không có sản phẩm phù hợp, hệ thống hiển thị thông báo không tìm thấy sản phẩm.
Nếu khách hàng xóa từ khóa tìm kiếm, hệ thống hiển thị lại danh sách sản phẩm theo bộ lọc danh mục hiện tại, nếu có.

### AC-CAT-03: Lọc sản phẩm theo danh mục
* Điều kiện: Danh sách sản phẩm đã được tải thành công.
* Hành động: Khách hàng chọn một danh mục sản phẩm.
* Kết quả mong đợi:
Hệ thống chỉ hiển thị các sản phẩm thuộc danh mục đã chọn, các sản phẩm thuộc danh mục khác không được hiển thị.
Nếu không có sản phẩm thuộc danh mục đã chọn, hệ thống hiển thị thông báo.
Khi khách hàng chọn danh mục Tất cả, hệ thống loại bỏ điều kiện lọc danh mục và giữ nguyên từ khóa tìm kiếm hiện tại, nếu có.

### AC-CAT-04: Kết hợp tìm kiếm và lọc danh mục
* Điều kiện: Danh sách sản phẩm đã được tải thành công.
* Hành động: Khách hàng nhập từ khóa tìm kiếm và chọn một danh mục.
* Kết quả mong đợi:
Hệ thống chỉ hiển thị các sản phẩm đồng thời phù hợp với từ khóa tìm kiếm và danh mục đã chọn.
Khi thay đổi từ khóa hoặc danh mục, danh sách kết quả được cập nhật tương ứng.
Nếu không có sản phẩm thỏa mãn đồng thời hai điều kiện, hệ thống hiển thị trạng thái danh sách trống.

### AC-CAT-05: Hiển thị trạng thái đang tải dữ liệu
* Điều kiện: Khách hàng mở trang Menu và dữ liệu sản phẩm chưa được tải xong.
* Hành động: Hệ thống đang chờ phản hồi từ API.
* Kết quả mong đợi: Giao diện hiển thị trạng thái đang tải dữ liệu và không hiển thị nhầm thông báo danh sách trống trước khi quá trình tải hoàn tất.

### AC-CAT-06: Xử lý danh sách sản phẩm rỗng
* Điều kiện: API trả về phản hồi thành công nhưng trường data là danh sách rỗng.
* Hành động: Hệ thống tiếp nhận và xử lý phản hồi từ API.
* Kết quả mong đợi:
Không có thẻ sản phẩm nào được hiển thị.
Giao diện hiển thị thông báo danh sách sản phẩm hiện chưa có.
Hệ thống không hiển thị thông báo lỗi tải dữ liệu.

### AC-CAT-07: Xử lý lỗi tải danh sách sản phẩm
* Điều kiện: Khách hàng mở trang Menu.
* Hành động: Yêu cầu lấy danh sách sản phẩm thất bại do lỗi mạng, máy chủ không phản hồi hoặc API trả về lỗi.
* Kết quả mong đợi:
Giao diện hiển thị thông báo không thể tải danh sách sản phẩm.
Hệ thống cung cấp nút thử lại.
Khi khách hàng chọn thử lại, hệ thống gửi lại yêu cầu lấy danh sách sản phẩm.
Nếu yêu cầu thử lại thành công, hệ thống hiển thị danh sách sản phẩm nhận được.