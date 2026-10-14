# BrewLite — Danh mục Test Scenarios

| | |
|---|---|
| **Dự án** | BrewLite — Ứng dụng đặt đồ uống không dùng tiền mặt |
| **Phiên bản tài liệu** | 1.0 |
| **Căn cứ** | Đặc tả yêu cầu BrewLite VER 1.0 |
| **Phạm vi** | MVP: từ chọn sản phẩm đến thanh toán và xác nhận đơn |

## 1. Mục đích và phạm vi

Tài liệu xác định các điều kiện cần kiểm thử để nghiệm thu MVP BrewLite. Các scenario được mô tả ở mức yêu cầu; dữ liệu và các bước thực thi chi tiết được xác định trong test case.

**Cách đánh mã yêu cầu**

| Mã | Nguồn trong đặc tả |
|---|---|
| FR-01 → FR-06 | Yêu cầu chức năng (Mục 4.1) |
| FR-07 → FR-10 | Nghiệp vụ backend của Task 10 (Mục 9) |
| NFR-01 → NFR-03 | Yêu cầu phi chức năng (Mục 4.2) |
| DEL-01 | Bàn giao sản phẩm (Task 1, Task 9, Mục 11) |

**Ngoài phạm vi:** chức năng dành cho nhân viên quầy/barista và các tính năng ngoài MVP. Các chuyển trạng thái sau PAID (PREPARING, READY, COMPLETED) được kiểm thử ở mức state machine/service, không qua giao diện.

**Công cụ đề xuất:** PostgreSQL và Docker Compose; Jest/Supertest (Unit, Integration); Playwright hoặc Cypress (E2E); k6 hoặc tương đương (hiệu năng); mock payment gateway cho thanh toán.

## 2. Chiến lược kiểm thử

| Mức | Phạm vi kiểm thử |
|---|---|
| Unit | Tính giá, tổng giỏ hàng, chuyển trạng thái đơn |
| Integration | API, validation, JWT, thanh toán, idempotency, tồn kho |
| E2E | Luồng người dùng qua giao diện và backend |
| Review | README, `.env.example` |

**Mức ưu tiên**

- **High:** luồng cốt lõi, bảo mật, giao dịch tiền, toàn vẹn dữ liệu đơn hàng.
- **Medium:** luồng phụ và trường hợp biên quan trọng.
- **Low:** hiển thị và kiểm tra hỗ trợ.

**Loại kiểm thử:** Positive, Negative, Boundary, Security, Concurrency, Performance.

## 3. Kịch bản bắt buộc theo tiêu chí nghiệm thu Task 10

Theo đặc tả, Task 10 phải có unit/integration test chứng minh các tiêu chí sau.

| Tiêu chí nghiệm thu | Scenario | Mức |
|---|---|---|
| (a) Chặn chuyển trạng thái đơn không hợp lệ | TS-FR-07-02 | Unit |
| (b) Hai yêu cầu cùng Idempotency-Key chỉ tạo một đơn | TS-FR-08-01 | Integration |
| (c) Đặt đồng thời không vượt tồn kho | TS-FR-09-01 | Integration |

## 4. Danh mục Test Scenarios

### 4.1. Nghiệp vụ backend nâng cao (Task 10)

#### FR-07 — Order State Machine

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-07-01 | Luồng trạng thái thành công | Positive | Unit | High | Hệ thống chấp nhận chuỗi PENDING → PAID → PREPARING → READY → COMPLETED theo đúng thứ tự. |
| TS-FR-07-02 | Chặn chuyển trạng thái không hợp lệ | Negative | Unit | High | Hệ thống từ chối mọi chuyển tiếp không có trong sơ đồ (`assertTransition` báo lỗi) và giữ nguyên trạng thái đơn. |
| TS-FR-07-03 | COMPLETED là trạng thái kết thúc | Boundary | Unit | High | Đơn COMPLETED không thể chuyển sang trạng thái khác. |
| TS-FR-07-04 | CANCELLED là trạng thái kết thúc | Boundary | Unit | High | Đơn CANCELLED không thể chuyển sang trạng thái khác. |
| TS-FR-07-05 | Nhánh PAYMENT_FAILED | Negative | Integration | High | Thanh toán lỗi chuyển đơn sang PAYMENT_FAILED. |
| TS-FR-07-06 | Thử lại sau PAYMENT_FAILED | Positive | Integration | High | Đơn PAYMENT_FAILED được phép thanh toán lại. |

#### FR-08 — Thanh toán idempotent

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-08-01 | Gửi lại yêu cầu cùng key | Positive | Integration | High | Hai yêu cầu cùng Idempotency-Key chỉ tạo một đơn và một giao dịch thanh toán. |
| TS-FR-08-02 | Gửi đồng thời cùng key | Concurrency | Integration | High | Các yêu cầu đồng thời cùng key không phát sinh giao dịch trùng. |
| TS-FR-08-03 | Lưu key và trả kết quả nhất quán | Positive | Integration | High | Key được lưu cùng Payment; yêu cầu lặp nhận kết quả giống lần xử lý đầu. |

#### FR-09 — Kiểm soát tồn kho khi đặt đồng thời

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-09-01 | Đặt đồng thời sản phẩm sắp hết | Concurrency | Integration | High | Transaction và optimistic locking đảm bảo tổng số lượng bán không vượt `stock`. |
| TS-FR-09-03 | Xung đột version tồn kho | Concurrency | Integration | High | Xung đột optimistic locking không gây sai lệch dữ liệu đơn hoặc tồn kho. |
| TS-FR-09-04 | Nhất quán khi cập nhật tồn kho | Positive | Integration | High | Đặt hàng thành công commit đồng thời thay đổi tồn kho và dữ liệu đơn. |

#### FR-10 — Khuyến mãi và điểm thưởng (loyalty)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-10-01 | Áp mã giảm giá hợp lệ | Positive | Integration | High | Mã hợp lệ được áp dụng và phản ánh vào tổng tiền đơn. |
| TS-FR-10-03 | Cộng điểm sau khi đơn PAID | Positive | Integration | High | `loyaltyPoints` của khách được cập nhật khi đơn đạt PAID. |
| TS-FR-10-04 | Không cộng điểm trùng | Concurrency | Integration | High | Xử lý lặp cùng một thanh toán chỉ cộng điểm một lần. |
| TS-FR-10-05 | Không cộng điểm cho đơn chưa PAID | Negative | Integration | High | Đơn PAYMENT_FAILED hoặc CANCELLED không được cộng điểm. |
| TS-FR-10-06 | Mã giảm giá không hợp lệ | Negative | Integration | Medium | Mã không hợp lệ không được áp dụng. |

### 4.2. Đặt hàng, thanh toán và xác thực

#### FR-05 — Tạo đơn và thanh toán không tiền mặt (US-05)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-05-01 | Tạo đơn hợp lệ | Positive | Integration | High | POST /orders lưu đơn của người dùng đã xác thực ở trạng thái PENDING và trả mã đơn. |
| TS-FR-05-02 | Thanh toán bằng Ví thành công | Positive | Integration | High | POST /payments ghi nhận thanh toán; đơn chuyển PAID. |
| TS-FR-05-03 | Thanh toán bằng Thẻ thành công | Positive | Integration | High | POST /payments ghi nhận thanh toán; đơn chuyển PAID. |
| TS-FR-05-04 | Thanh toán thất bại | Negative | Integration | High | Đơn chuyển PAYMENT_FAILED. |
| TS-FR-05-05 | Validate yêu cầu tạo đơn | Negative | Integration | High | Payload không hợp lệ bị từ chối; không tạo đơn. |
| TS-FR-05-06 | Đối chiếu tổng tiền đơn | Positive | Integration | High | Tổng tiền đơn khớp tổng các dòng hàng (`lineTotal`). |
| TS-FR-05-07 | Hoàn tất luồng US-05 | Positive | E2E | High | Luồng từ giỏ hàng đến tạo đơn và nhận kết quả thanh toán hoàn tất theo kết quả của mock gateway. |
| TS-FR-05-08 | Giỏ hàng rỗng | Negative | Integration | High | Hệ thống không tạo đơn hoặc thanh toán khi giỏ không có sản phẩm. |
| TS-FR-05-09 | Hiển thị nút Thanh toán | Positive | E2E | High | Giỏ có ít nhất một sản phẩm thì nút "Thanh toán" hiển thị cùng tổng tiền. |
| TS-FR-05-10 | Giữ giỏ hàng khi thanh toán lỗi | Negative | E2E | High | Khi thanh toán lỗi, giỏ hàng được giữ nguyên. |

#### FR-04 — Xác thực, JWT và bảo vệ route đặt đơn

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-04-01 | Đăng ký hợp lệ | Positive | Integration | High | POST /auth/register tạo tài khoản khi dữ liệu hợp lệ. |
| TS-FR-04-02 | Dữ liệu đăng ký không hợp lệ | Negative | Integration | High | Dữ liệu sai validation bị từ chối; không tạo tài khoản. |
| TS-FR-04-03 | Email đã đăng ký | Negative | Integration | High | Email trùng bị từ chối; không tạo tài khoản trùng. |
| TS-FR-04-04 | Đăng nhập và nhận JWT | Positive | Integration | High | POST /auth/login trả JWT sử dụng được cho route được bảo vệ. |
| TS-FR-04-05 | Đăng nhập sai thông tin | Negative | Integration | High | Thông tin sai không được cấp quyền truy cập. |
| TS-FR-04-06 | Băm mật khẩu bằng bcrypt | Security | Integration | High | `passwordHash` là giá trị băm, không phải plaintext. |
| TS-FR-04-07 | Bảo vệ route đặt đơn | Security | Integration | High | Yêu cầu tạo đơn không có JWT hợp lệ bị từ chối. |
| TS-FR-04-08 | JWT hết hạn hoặc không hợp lệ | Security | Integration | High | Không được cấp quyền truy cập route được bảo vệ. |
| TS-FR-04-09 | Yêu cầu đăng nhập trước khi thanh toán | Positive | E2E | High | Khách chưa đăng nhập được điều hướng đăng nhập, sau đó tiếp tục luồng đặt hàng. |

#### FR-06 — Xác nhận đơn và lịch sử đơn (Order History)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-06-01 | Xem xác nhận đơn sau thanh toán | Positive | E2E | High | Sau khi thanh toán thành công, màn hình xác nhận hiển thị `orderNumber`, số tiền `finalAmount` và trạng thái `PAID`. |
| TS-FR-06-02 | Xem danh sách lịch sử đơn hàng | Positive | Integration | High | `GET /api/v1/orders/me` trả danh sách đơn của tài khoản đang xác thực bọc trong `data.items` theo format `TransformInterceptor`. |
| TS-FR-06-03 | Phân trang danh sách lịch sử | Positive | Integration | High | Hỗ trợ tham số `page` và `limit`; metadata trả về đầy đủ `pagination: { page, limit, total, totalPages, hasNextPage }`. |
| TS-FR-06-04 | Lọc đơn hàng theo trạng thái | Positive | Integration | High | Tham số `status` lọc đúng các trạng thái đơn hợp lệ (`PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `PAYMENT_FAILED`, `CANCELLED`). |
| TS-FR-06-05 | Xem chi tiết một đơn hàng | Positive | Integration | High | `GET /api/v1/orders/:id` trả chi tiết các món trong đơn, phụ thu size và danh sách topping đính kèm (`toppings`). |
| TS-FR-06-06 | Cô lập dữ liệu theo người dùng | Security | Integration | High | Truy vấn đơn hàng không thuộc quyền sở hữu của user trả về `404 Not Found` (không để lộ sự tồn tại của đơn người khác). |
| TS-FR-06-07 | Tài khoản chưa có đơn hàng nào | Boundary | Integration | Medium | Hệ thống trả `200 OK` với `items: []`, `total: 0`; giao diện hiển thị Empty State thân thiện. |
| TS-FR-06-08 | Truy cập lịch sử khi chưa xác thực | Security | Integration | High | Yêu cầu không có JWT hoặc token hết hạn bị từ chối với mã lỗi `401 Unauthorized`. |

### 4.3. Menu, chi tiết sản phẩm và giỏ hàng

#### FR-01 — Menu đồ uống (Product Catalog)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-01-01 | Hiển thị danh sách sản phẩm | Positive | E2E | High | Menu hiển thị danh sách món với tên, giá, ảnh bọc qua `TransformInterceptor` (`GET /api/v1/products`). |
| TS-FR-01-02 | Phân loại Category dạng tabs | Positive | E2E | High | Frontend trích xuất danh sách category duy nhất từ dữ liệu món; bấm tab danh mục lọc đúng các món thuộc danh mục đó. |
| TS-FR-01-03 | Gom món không danh mục vào tab "Khác" | Boundary | E2E | Medium | Các sản phẩm có `categoryName = null` được tự động gom vào tab "Khác", hiển thị ở cuối danh sách tab. |
| TS-FR-01-04 | Tìm kiếm sản phẩm không dấu tiếng Việt | Positive | E2E | High | Tìm kiếm client-side không phân biệt hoa thường và dấu tiếng Việt (gõ "tra dao", "trà đào", "TRA DAO" đều ra đúng kết quả). |
| TS-FR-01-05 | Lọc bỏ món không khả dụng hoặc hết hàng | Security | Integration | High | API `GET /products` chỉ trả món có `isAvailable = true` VÀ `stock > 0`; món có `isAvailable = false` hoặc `stock = 0` không hiển thị trên Menu. |
| TS-FR-01-06 | Trạng thái loading và empty menu | Boundary | E2E | Medium | Giao diện hiển thị Skeleton khi đang tải; khi không có món hoặc kết quả tìm kiếm rỗng thì hiển thị Empty State thân thiện. |
| TS-FR-01-07 | Xử lý lỗi kết nối tải menu | Negative | E2E | Medium | Khi API lỗi hoặc mất kết nối, giao diện hiển thị thông báo lỗi và nút "Thử lại", không làm crash ứng dụng. |

#### FR-02 — Chi tiết sản phẩm, size và topping (Product Detail & Customization)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-02-01 | Xem chi tiết sản phẩm hợp lệ | Positive | E2E | High | `GET /api/v1/products/:id` trả thông tin chi tiết: tên, basePrice, ảnh, categoryName, isAvailable và sizePrices. |
| TS-FR-02-02 | Xem sản phẩm hết hàng hoặc ngừng bán | Boundary | E2E | High | Sản phẩm có `stock = 0` hoặc `isAvailable = false` vẫn xem được chi tiết với `isAvailable = false`; UI hiển thị nhãn "Hết hàng" và vô hiệu hóa nút "Thêm vào giỏ hàng". |
| TS-FR-02-03 | Chọn size tính đúng phụ thu | Positive | Unit | High | Chọn Size S/M/L cộng đúng phụ thu `priceAdjustment` (Size S: -5.000đ, Size M: 0đ, Size L: +10.000đ theo seed). |
| TS-FR-02-04 | Chọn topping cộng dồn giá | Positive | Unit | High | Chọn topping cộng đúng đơn giá topping; công thức: `(basePrice + sizeAdjustment + Σ toppingPrice) × quantity`. |
| TS-FR-02-05 | Chặn chọn topping trùng lặp | Negative | Unit | High | Không cho phép chọn cùng một loại topping nhiều lần trên cùng một ly (`@ArrayUnique()`). |
| TS-FR-02-06 | Sản phẩm không tồn tại | Negative | Integration | Medium | `GET /api/v1/products/:id` với ID không tồn tại trả về `404 Not Found` theo chuẩn `AllExceptionsFilter`. |

#### FR-03 — Quản lý trạng thái giỏ hàng (Cart State Management)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-FR-03-01 | Thêm sản phẩm vào giỏ | Positive | E2E | High | Sản phẩm được lưu vào Zustand store cùng kích cỡ, danh sách topping đã chọn; badge giỏ hàng cập nhật số lượng. |
| TS-FR-03-02 | Gộp dòng trùng theo Composite Key | Positive | Unit | High | Thêm món trùng `productId + size + toppingIds` thì tự động gộp dòng và cộng dồn số lượng; khác size hoặc khác topping thì tạo dòng mới riêng biệt. |
| TS-FR-03-03 | Tăng / giảm số lượng dòng món | Positive | E2E | High | Bấm `+` tăng 1, bấm `-` giảm 1; tổng tiền giỏ hàng và badge số lượng được tính lại ngay lập tức. |
| TS-FR-03-04 | Tự động xóa dòng khi số lượng về 0 | Positive | Unit | Medium | Bấm `-` khi số lượng = 1 hoặc bấm biểu tượng "Xóa" thì dòng sản phẩm bị loại bỏ khỏi giỏ hàng. |
| TS-FR-03-05 | Khóa nút thanh toán khi giỏ hàng rỗng | Boundary | E2E | High | Khi `items.length === 0`, nút "Đặt hàng / Thanh toán" bị vô hiệu hóa; giao diện hiển thị Empty Cart UI. |
| TS-FR-03-06 | Xác thực tổng tiền và bảo vệ giá | Security | Integration | High | Tổng tiền hiển thị trên client được tính từ đơn giá đã biết; khi gửi `POST /orders`, backend tự tính toán lại độc lập và không tin cậy giá từ client. |
| TS-FR-03-07 | Duy trì trạng thái giỏ hàng khi điều hướng | Positive | E2E | Medium | Giỏ hàng được lưu trong state/storage, không bị mất dữ liệu khi người dùng chuyển qua lại giữa Menu, Detail và Cart. |

### 4.4. Phi chức năng và bàn giao

#### NFR-01 — Thời gian phản hồi API dưới 500ms (dữ liệu mẫu)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-NFR-01-01 | GET /products | Performance | Integration | Medium | Thời gian phản hồi < 500ms. |
| TS-NFR-01-02 | GET /products/:id | Performance | Integration | Medium | Thời gian phản hồi < 500ms. |
| TS-NFR-01-03 | POST /orders, POST /payments | Performance | Integration | High | Thời gian phản hồi < 500ms. |
| TS-NFR-01-04 | GET /orders/me | Performance | Integration | Medium | Thời gian phản hồi < 500ms. |
| TS-NFR-01-05 | POST /auth/register, POST /auth/login | Performance | Integration | Medium | Thời gian phản hồi < 500ms. |

#### NFR-02 — Bảo mật

Nội dung băm mật khẩu và JWT được bao phủ bởi TS-FR-04-06, TS-FR-04-07 và TS-FR-04-08.

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-NFR-02-04 | Dữ liệu đầu vào không hợp lệ | Security | Integration | High | API từ chối dữ liệu vi phạm ràng buộc validation. |
| TS-NFR-02-05 | Không lộ passwordHash | Security | Integration | Medium | Response API không chứa `passwordHash`. |

#### NFR-03 — Tương thích trình duyệt

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-NFR-03-01 | Luồng MVP trên các trình duyệt web phổ biến | Positive | E2E | High | Luồng chọn sản phẩm → thanh toán → xác nhận vận hành đúng trên danh sách trình duyệt được thống nhất để kiểm thử. |

#### DEL-01 — Bàn giao và demo

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-DEL-01-01 | Khởi chạy bằng Docker Compose | Positive | Integration | High | `docker compose up` khởi chạy đủ frontend, backend và database. |
| TS-DEL-01-02 | Tài liệu README | Positive | Review | Medium | README có hướng dẫn thiết lập và chạy dự án. |
| TS-DEL-01-03 | Tệp `.env.example` | Positive | Review | High | `.env.example` cung cấp đủ biến môi trường mẫu cần thiết. |
| TS-DEL-01-04 | Demo end-to-end | Positive | E2E | High | Trình diễn được luồng chọn sản phẩm → giỏ hàng → thanh toán → xác nhận đơn. |

### 4.5. Kịch bản kiểm thử tích hợp toàn trình (End-to-End Integration Scenarios)

| Mã | Kịch bản | Loại | Mức | Ưu tiên | Các bước thực hiện & Kết quả mong đợi |
|---|---|---|---|---|---|
| TS-E2E-FULL-01 | Luồng mua hàng & thanh toán trọn vẹn (Happy Path E2E) | Positive | E2E | High | **Bước 1:** Khách hàng đăng ký/đăng nhập (`POST /auth/login`) nhận Bearer JWT.<br>**Bước 2:** Vào Menu Catalog (`GET /products`), lọc theo category, tìm kiếm "Cà phê sữa đá".<br>**Bước 3:** Vào trang Product Detail (`GET /products/:id`), chọn Size L (+10.000đ) và Topping "Trân châu đen" (+10.000đ). Giá hiển thị: 55.000đ.<br>**Bước 4:** Thêm vào giỏ hàng (`useCartStore`). Mở Cart Drawer kiểm tra đúng món, size, topping, số lượng = 1, tổng tiền = 55.000đ.<br>**Bước 5:** Nhấn "Đặt hàng" -> Gửi `POST /orders` kèm Bearer JWT. Backend xác thực, kiểm tra tồn kho, tạo đơn hàng trạng thái `PENDING` với mã `orderNumber: 1042`.<br>**Bước 6:** Chuyển sang màn hình thanh toán -> Chọn phương thức "Ví điện tử" -> Gửi `POST /payments` kèm header `Idempotency-Key` -> Mock payment gateway xác nhận thành công -> Đơn hàng cập nhật trạng thái `PAID`.<br>**Bước 7:** Điều hướng sang màn hình Xác nhận đơn -> Bấm xem Lịch sử đơn hàng (`GET /orders/me`) -> Thấy đơn vừa tạo có `orderNumber: 1042`, trạng thái `PAID` và số tiền 55.000đ. |
| TS-E2E-FAIL-01 | Luồng thanh toán thất bại và thử lại (Retry Flow) | Positive | E2E | High | **Bước 1:** Đặt hàng thành công tạo đơn `PENDING`.<br>**Bước 2:** Thanh toán thất bại (giả lập gateway lỗi) -> Đơn chuyển trạng thái `PAYMENT_FAILED`.<br>**Bước 3:** Khách hàng nhấn nút "Thử lại thanh toán" -> Gửi lại `POST /payments` với `Idempotency-Key` mới -> Thanh toán thành công -> Đơn chuyển `PAID`. |
| TS-E2E-STOCK-01 | Luồng chặn đặt hàng khi sản phẩm hết hàng đồng thời | Concurrency | Integration | High | Sản phẩm chỉ còn tồn kho = 1. Hai tài khoản cùng bấm đặt hàng đồng thời -> Chỉ 1 đơn tạo thành công (`201 Created`), đơn còn lại nhận thông báo hết hàng (`400 Bad Request`), tồn kho không bị âm. |

## 5. Ma trận truy vết

| Yêu cầu | Feature | Task theo đặc tả | Scenario |
|---|---|---|---|
| FR-01 | Product Catalog | Task 2 — API danh sách sản phẩm; Task 3 — Trang Menu | TS-FR-01-01 → 07 |
| FR-02 | Product Detail | Task 4 — Chi tiết và tùy chọn sản phẩm | TS-FR-02-01 → 06 |
| FR-03 | Cart | Task 5 — Giỏ hàng | TS-FR-03-01 → 07 |
| FR-04 | Auth + hệ thống | Task 7 — Đăng ký / Đăng nhập (JWT) | TS-FR-04-01 → 09 |
| FR-05 | Order; Payment | US-05; Task 6 — API tạo đơn hàng; Task 8 — Thanh toán không tiền mặt | TS-FR-05-01 → 10 |
| FR-06 | Order History | Task 9 — Xác nhận, lịch sử đơn và bàn giao | TS-FR-06-01 → 08 |
| FR-07 | Order | Task 10 — Nghiệp vụ backend (Order State Machine) | TS-FR-07-01 → 06 |
| FR-08 | Payment | Task 10 — Nghiệp vụ backend (thanh toán idempotent) | TS-FR-08-01 → 03 |
| FR-09 | — | Task 10 — Nghiệp vụ backend (kiểm soát tồn kho) | TS-FR-09-01, 03, 04 |
| FR-10 | — | Task 10 — Nghiệp vụ backend (khuyến mãi và loyalty) | TS-FR-10-01, 03 → 06 |
| E2E | Tích hợp | Toàn bộ 6 feature Tuần 1 | TS-E2E-FULL-01, TS-E2E-FAIL-01, TS-E2E-STOCK-01 |
| NFR-01 | — | — | TS-NFR-01-01 → 05 |
| NFR-02 | Auth + hệ thống | — | TS-NFR-02-04, 05; TS-FR-04-06 → 08 |
| NFR-03 | — | — | TS-NFR-03-01 |
| DEL-01 | — | Task 1 — Khởi tạo dự án và cấu trúc; Task 9 — Bàn giao | TS-DEL-01-01 → 04 |