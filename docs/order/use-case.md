# Use Case: Create Order

> Feature: Order | Owner: Tôn Thất Hạnh | Phiên bản: v1

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| ID | UC-06 (điều chỉnh theo naming convention của nhóm nếu cần) |
| Tên | Create Order (Tạo đơn hàng) |
| Actor chính | Khách hàng |
| Actor phụ | Hệ thống Backend (NestJS), cơ sở dữ liệu (CSDL) |
| Mô tả | Khách hàng gửi thông tin giỏ hàng để tạo đơn hàng mới. Hệ thống kiểm tra dữ liệu, sản phẩm, topping và tồn kho; tính tổng tiền ở phía server và tạo đơn hàng ở trạng thái `PENDING` nếu yêu cầu hợp lệ. |
| Phạm vi | Từ lúc khách hàng yêu cầu đặt hàng đến khi hệ thống trả về kết quả tạo đơn và mã đơn hàng. Thanh toán thuộc phạm vi của feature Payment. |
| Trigger | Khách hàng nhấn “Đặt hàng” trên giao diện giỏ hàng. |

## 2. Pre-condition

1. Khách hàng đã đăng nhập vào hệ thống BrewLite và có Bearer JWT token hợp lệ trong header `Authorization`.
2. Request chứa ít nhất một phần tử trong `items`; mỗi phần tử có `productId`, `quantity` và các trường tùy chọn phù hợp như `size`, `toppingIds`.
3. Sản phẩm được yêu cầu tồn tại, đang khả dụng (`isAvailable = true`) và có đủ tồn kho (`stock >= quantity`).
4. Các topping được yêu cầu (nếu có) phải tồn tại, đang khả dụng và đáp ứng điều kiện tồn kho.
5. Dữ liệu đầu vào đáp ứng các quy tắc validation của backend (`CreateOrderDto`).

## 3. Post-condition

**Thành công:**

- Có bản ghi `Order` ở trạng thái `PENDING` và các bản ghi `OrderItem` tương ứng.
- Backend tự tính và lưu các giá trị tiền theo quy tắc nghiệp vụ, gồm `totalAmount`, `discountAmount` và `finalAmount`.
- Tồn kho sản phẩm và topping được cập nhật trong transaction theo số lượng đã đặt.
- Hệ thống trả về thông tin đơn hàng, bao gồm `id` và các dữ liệu liên quan trong response.
- Frontend có thể sử dụng thông tin đơn hàng để chuyển sang bước tiếp theo của quy trình đặt hàng.

**Thất bại:**

- Request bị từ chối hoặc xử lý thất bại; không tạo đơn hàng thành công.
- Nếu transaction thất bại, các cập nhật dữ liệu và tồn kho trong transaction được rollback.
- Tồn kho không bị trừ dở dang khi quá trình tạo đơn thất bại.
- Giỏ hàng trên frontend được giữ nguyên nếu frontend không chủ động xóa hoặc cập nhật giỏ hàng.

## 4. Main flow

| Bước | Tác nhân | Hành động |
|---|---|---|
| 1 | Khách hàng | Bấm “Đặt hàng” trên giao diện giỏ hàng. |
| 2 | Frontend | Gửi request `POST /api/v1/orders` kèm header `Authorization: Bearer <JWT>` và body `{ items: [{ productId, size, quantity, toppingIds }] }`. |
| 3 | Backend | Tiếp nhận request, `JwtAuthGuard` xác thực token và trích xuất `userId = req.user.sub`; `ValidationPipe` kiểm tra dữ liệu đầu vào theo DTO. |
| 4 | Backend | Kiểm tra thông tin người dùng, sản phẩm, topping và số lượng tồn kho theo yêu cầu đặt hàng. |
| 5 | Backend | Tính giá phía server, bao gồm giá sản phẩm theo kích cỡ và giá topping; tính `lineTotal` cùng các giá trị tiền của đơn hàng. |
| 6 | Backend | Mở transaction, cập nhật tồn kho sản phẩm và topping bằng các thao tác kiểm tra điều kiện tồn kho trước khi trừ số lượng. |
| 7 | Backend | Tạo bản ghi `Order` ở trạng thái `PENDING`, các bản ghi `OrderItem`, `OrderItemTopping` và lịch sử trạng thái ban đầu (`fromStatus: null, toStatus: PENDING`). |
| 8 | Cơ sở dữ liệu | Commit transaction nếu các thao tác thành công; rollback các thay đổi thuộc transaction nếu có lỗi. |
| 9 | Backend | Trả response `201 Created` chứa thông tin đơn hàng bọc qua `TransformInterceptor` (`id`, `orderNumber`, `status: PENDING`, `totalAmount`, `discountAmount`, `finalAmount`). |
| 10 | Frontend | Nhận kết quả tạo đơn, xóa giỏ hàng local và chuyển sang màn hình thanh toán (feature Payment). |

## 5. Alternative / Error flow

| Mã | Tại bước | Điều kiện | Xử lý | Kết quả |
|---|---|---|---|---|
| 3a | 3 | Chưa đăng nhập, JWT sai hoặc hết hạn | Trả `401 Unauthorized` | Frontend thông báo phiên hết hạn và điều hướng tới trang đăng nhập; giỏ hàng được giữ nguyên |
| 4a | 4 | Dữ liệu đầu vào không hợp lệ, thiếu trường bắt buộc, `quantity < 1` hoặc `size` không hợp lệ | Từ chối request; trả `400 Bad Request` kèm thông báo validation | Không tạo đơn hàng thành công |
| 4b | 4 | Sản phẩm không tồn tại hoặc không khả dụng | Từ chối request; trả `400 Bad Request` (hoặc `404 Not Found`) | Không tạo đơn hàng thành công; frontend thông báo để khách hàng kiểm tra lại giỏ |
| 4c | 4 | Topping không tồn tại hoặc không hợp lệ | Từ chối request; trả `400 Bad Request` | Không tạo đơn hàng thành công |
| 5a | 5 | Lỗi khi tính giá hoặc dữ liệu giá không hợp lệ | Từ chối request theo quy tắc xử lý lỗi thực tế | Không tạo đơn hàng với giá không hợp lệ |
| 6a | 6 | Tồn kho không đủ, hoặc cập nhật tồn kho có điều kiện thất bại | Backend phát sinh lỗi và transaction được rollback; trả `400 Bad Request` | Không tạo đơn thành công; tồn kho không bị trừ dở dang |
| 6b | 6 | Nhiều request cùng đặt sản phẩm có tồn kho giới hạn | Cập nhật tồn kho có điều kiện bảo đảm tính nguyên tử; request không đủ hàng thất bại | Không bán vượt số lượng tồn kho; request thất bại được xử lý lỗi thích hợp |
| 7a | 7 | Lỗi cơ sở dữ liệu khi tạo đơn hoặc chi tiết đơn | Transaction rollback nếu lỗi xảy ra trong transaction | Không để lại dữ liệu đơn hàng hoặc thay đổi tồn kho dở dang |

### Ghi chú

- Các mã HTTP tuân theo quy ước chung của `AllExceptionsFilter`.
- Việc giữ nguyên giỏ hàng khi lỗi là hành vi phía frontend; sau khi tạo đơn thành công frontend mới dọn giỏ hàng.
- Với các lỗi tạo đơn, kiểm tra bảo đảm tồn kho và dữ liệu không bị thay đổi dở dang.

## 6. Business rules

| ID | Quy tắc |
|---|---|
| BR-01 | Giá đơn hàng do **server tính toán** dựa trên dữ liệu và quy tắc giá ở backend; không tin tưởng giá do client gửi lên. |
| BR-02 | Đơn hàng mới tạo có trạng thái `PENDING`; client không được tự chọn trạng thái khi tạo đơn. |
| BR-03 | **Xác thực JWT:** Request tạo đơn bắt buộc có Bearer JWT. `userId` được trích xuất từ `req.user.sub`; request body KHÔNG nhận `userId` để bảo đảm tính an toàn danh tính. |
| BR-04 | Tồn kho sản phẩm và topping được cập nhật trong transaction cùng quá trình tạo đơn; nếu transaction thất bại, các thay đổi thuộc transaction phải được rollback. |
| BR-05 | Quy tắc tự động hủy đơn `PENDING` hoặc `PAYMENT_FAILED` sau 15 phút và hoàn lại tồn kho chỉ áp dụng khi thời hạn hết hạn, scheduler và nghiệp vụ liên quan được triển khai, xác nhận. |
| BR-06 | Backend tính và lưu các giá trị `totalAmount`, `discountAmount` và `finalAmount`. Quy tắc áp dụng mã khuyến mãi chỉ được bổ sung khi chức năng khuyến mãi được xác nhận. |
| BR-07 | Các chuyển đổi trạng thái đơn hàng phải tuân theo State Machine đã thống nhất. Sử dụng hàm `assertTransition` để chặn các chuyển đổi trái phép. |
| BR-08 | Một đơn hàng phải có ít nhất một phần tử trong `items`; mỗi `quantity` phải là số nguyên từ `1` đến `100`. |

## 7. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | **Given:** `userId` hợp lệ, `items` có ít nhất một sản phẩm hợp lệ và đủ tồn kho. **When:** Gửi request tạo đơn. **Then:** Trả `201 Created`, đơn có trạng thái `PENDING`, các giá trị tiền được backend tính toán và response chứa mã đơn hàng. |
| AC-02 | **Given:** Request không có `userId` hợp lệ. **When:** Gửi request tạo đơn. **Then:** Request bị từ chối và không tạo đơn thành công; mã HTTP cụ thể được xác nhận theo xử lý lỗi thực tế của backend. |
| AC-03 | **Given:** `quantity = 0`, `quantity` không phải số nguyên hoặc `size` không hợp lệ. **When:** Gửi request tạo đơn. **Then:** Trả lỗi validation phù hợp, dự kiến `400 Bad Request`, và không tạo đơn thành công. |
| AC-04 | **Given:** Request chứa topping không tồn tại hoặc không hợp lệ. **When:** Gửi request tạo đơn. **Then:** Request bị từ chối và không tạo đơn thành công. |
| AC-05 | **Given:** Một sản phẩm không đủ tồn kho. **When:** Gửi request đặt hàng với số lượng vượt tồn kho. **Then:** Request thất bại, không tạo đơn thành công và tồn kho không bị trừ dở dang. Mã HTTP phải khớp với exception thực tế của backend. |
| AC-06 | **Given:** Tồn kho sản phẩm bằng `5`, có `10` request đồng thời, mỗi request đặt `quantity = 1`. **When:** Các request được xử lý. **Then:** Tối đa `5` request thành công, tồn kho cuối cùng không âm và không bán vượt số lượng có sẵn. Mã lỗi của các request thất bại phụ thuộc vào cách backend xử lý lỗi cạnh tranh. |
| AC-07 | **Given:** Lỗi xảy ra trong transaction khi tạo đơn. **When:** Backend xử lý request. **Then:** Transaction được rollback; không để lại đơn hàng hoặc thay đổi tồn kho dở dang. |
| AC-08 | **Given:** Yêu cầu tạo đơn thành công. **When:** Backend trả kết quả. **Then:** Response chứa các trường tiền theo hợp đồng API hiện tại, gồm `totalAmount`, `discountAmount` và `finalAmount`; giá trị phải được tính ở phía server. |

### Ghi chú

- Chỉ bổ sung tiêu chí về JWT khi endpoint được xác nhận có cơ chế xác thực bắt buộc.
- Chưa đưa tiêu chí mã khuyến mãi và `expiresAt` vào danh sách bắt buộc vì hai chức năng này chưa được xác nhận trong backend hiện tại.
- Các tiêu chí kiểm thử đồng thời cần được xác minh bằng integration test với cơ sở dữ liệu thực tế.

## 8. Liên kết với Activity và State Machine

| Luồng | Trạng thái đơn / Kết quả |
|---|---|
| Main flow bước 7–9: tạo đơn thành công | Tạo đơn mới ở trạng thái `PENDING`; transaction được commit và backend trả kết quả tạo đơn |
| Error flow 3a, 4a, 4b, 4c, 5a, 6a, 6b, 7a | Request thất bại; không tạo đơn thành công. Nếu lỗi xảy ra trong transaction, các thay đổi thuộc transaction được rollback |
| Thanh toán thành công (feature Payment) | `PENDING → PAID`, theo State Machine đã thống nhất |
| Thanh toán thất bại | `PENDING → PAYMENT_FAILED`, theo quy tắc xử lý thanh toán đã thống nhất |
| Thử lại sau thanh toán thất bại | `PAYMENT_FAILED → PENDING`, nếu nghiệp vụ cho phép thử lại |
| Khách hủy đơn | Chuyển sang `CANCELLED` nếu trạng thái hiện tại cho phép và chức năng hủy đơn đã được triển khai |
| Đơn hết hạn | Chỉ chuyển sang trạng thái hết hạn hoặc `CANCELLED` theo quy tắc đã thống nhất khi cơ chế hết hạn được triển khai |

### Tài liệu liên quan

- `activity-order.puml` (Sơ đồ Activity PlantUML)
- `usecase-order.puml` (Sơ đồ Use Case PlantUML)
- `activity.md` (Đặc tả Activity flow)
- `state-machine.md` (Đặc tả Order State Machine)
- `api-contract.md` (Hợp đồng API)
- `db-mapping-order.md` (Mapping cơ sở dữ liệu)
- `fe-be-skeleton.md` (Bộ khung mã nguồn FE & BE mẫu)
- `test-cases.md` (Bộ kịch bản test case)

## 9. Thống nhất liên feature — Cần xác nhận với các thành viên

| Với | Nội dung cần chốt | Trạng thái |
|---|---|---|
| Gia Kiệt (Payment) | Quy tắc thử lại thanh toán: `PAYMENT_FAILED → PENDING`; thống nhất thành phần chịu trách nhiệm gọi hàm chuyển trạng thái khi thanh toán thành công hoặc thất bại | Chờ xác nhận |
| Hoàng Huy (Product Detail) | Công thức tính `lineTotal` dựa trên giá sản phẩm, kích cỡ và topping; xác nhận server là nơi tính giá cuối cùng | Chờ xác nhận |
| Tuấn Hào (Cart) | Thống nhất cấu trúc request `POST /api/v1/orders`: `items[{productId, size, quantity, toppingIds}]`; xác nhận cách frontend chuyển dữ liệu topping sang `toppingIds` | Chờ xác nhận |
| Quang Huy (History) | Thống nhất các trường Order mà `GET /orders/me` cần trả về, ví dụ `id`, `status`, `totalAmount`, `createdAt`, `items`; xác nhận endpoint và cấu trúc response trước khi tích hợp | Chờ xác nhận |

### Ghi chú

- Cấu trúc request cần thống nhất với `CreateOrderDto` hiện tại.
- Endpoint `GET /orders/me` cần được xác nhận đã triển khai trước khi tài liệu mô tả đây là API có sẵn.
- Chỉ đổi trạng thái đơn hàng theo quy tắc State Machine mà nhóm đã thống nhất.
- Cập nhật trạng thái từ “Chờ xác nhận” sau khi các thành viên liên quan thống nhất và kiểm tra implementation.

## 10. Wireframe

**Tài liệu thiết kế:** Figma — chờ bổ sung liên kết.

Wireframe dự kiến gồm các màn hình và trạng thái sau:

| Màn hình / Trạng thái | Nội dung cần thể hiện |
|---|---|
| Checkout (Xác nhận đơn hàng) | Danh sách sản phẩm, kích cỡ, topping, số lượng và tổng tiền dự kiến |
| Confirm — Success | Thông báo tạo đơn thành công, mã đơn hàng và thông tin tổng tiền |
| Confirm — Failure | Thông báo lỗi khi tạo đơn thất bại; cho phép khách hàng quay lại kiểm tra giỏ hàng |
| Confirm — Out of stock | Thông báo sản phẩm không đủ tồn kho và hướng dẫn khách hàng điều chỉnh giỏ hàng |

**Trạng thái:** Chưa có liên kết Figma được xác nhận. Bổ sung URL sau khi nhóm hoàn thành wireframe.
