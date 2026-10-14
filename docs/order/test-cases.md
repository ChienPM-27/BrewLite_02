# Test Cases: Order

> Feature: Order | Owner: Tôn Thất Hạnh | Phiên bản: v1
> Đây là bảng case test (thiết kế), chưa phải code test. Mỗi case dùng cho unit/integration test ở Sprint sau.

## 1. Chuyển trạng thái (Order State Machine)

### 1.1 Chuyển tiếp hợp lệ (phải cho phép)

| ID | Từ → Sang | Sự kiện | Kết quả mong đợi |
|---|---|---|---|
| TC-ST-01 | `PENDING → PAID` | Thanh toán thành công | Cho phép |
| TC-ST-02 | `PENDING → PAYMENT_FAILED` | Thanh toán lỗi | Cho phép |
| TC-ST-03 | `PENDING → CANCELLED` | Khách hủy | Cho phép theo State Machine; xử lý tồn kho theo quy tắc nghiệp vụ đã thống nhất |
| TC-ST-04 | `PAYMENT_FAILED → PENDING` | Thử lại | Cho phép |
| TC-ST-05 | `PAYMENT_FAILED → CANCELLED` | Hủy đơn | Cho phép, xử lý tồn kho theo quy tắc nghiệp vụ đã thống nhất |
| TC-ST-06 | `PAID → PREPARING` | Barista nhận đơn | Cho phép |
| TC-ST-07 | `PAID → CANCELLED` | Hủy trước khi pha | Cho phép theo State Machine; hoàn tiền, hoàn tồn kho và điều chỉnh điểm cần xác nhận với nhóm |
| TC-ST-08 | `PREPARING → READY` | Pha xong | Cho phép |
| TC-ST-09 | `READY → COMPLETED` | Giao khách | Cho phép |

### 1.2 Chuyển tiếp sai (phải chặn)

Các chuyển tiếp không được State Machine cho phép phải bị từ chối và giữ nguyên trạng thái hiện tại. `409 Conflict` là mã HTTP dự kiến nếu backend triển khai cơ chế xử lý xung đột tương ứng; cần xác minh với implementation thực tế.

| ID | Từ → Sang | Lý do chặn | Kết quả mong đợi |
|---|---|---|---|
| TC-ST-10 | `PENDING → PREPARING` | Chưa thanh toán | Chặn, `409` |
| TC-ST-11 | `PENDING → READY` | Nhảy cóc trạng thái | Chặn, `409` |
| TC-ST-12 | `PENDING → COMPLETED` | Nhảy cóc trạng thái | Chặn, `409` |
| TC-ST-13 | `PAYMENT_FAILED → PAID` | Không cho phép bỏ qua `PENDING` nếu quy tắc thử thanh toán lại đã được nhóm thống nhất | Chặn theo State Machine dự kiến; mã HTTP cần đối chiếu với implementation |
| TC-ST-14 | `PAID → PENDING` | Không quay lui | Chặn, `409` |
| TC-ST-15 | `PAID → READY` | Bỏ qua `PREPARING` | Chặn, `409` |
| TC-ST-16 | `PREPARING → CANCELLED` | Barista đã pha, không hủy | Chặn, `409` |
| TC-ST-17 | `PREPARING → PAID` | Không quay lui | Chặn, `409` |
| TC-ST-18 | `READY → CANCELLED` | Đã pha xong, không hủy | Chặn, `409` |
| TC-ST-19 | `COMPLETED → PAID` | Trạng thái kết thúc | Chặn, `409` |
| TC-ST-20 | `COMPLETED → CANCELLED` | Trạng thái kết thúc | Chặn, `409` |
| TC-ST-21 | `CANCELLED → PENDING` | Trạng thái kết thúc | Chặn, `409` |
| TC-ST-22 | `CANCELLED → PAID` | Trạng thái kết thúc | Chặn, `409` |
| TC-ST-23 | `PENDING → PENDING` | Chuyển về chính nó | Chặn, `409` |

### 1.3 Kiểm thử toàn bộ (gợi ý cho unit test)

Duyệt toàn bộ 7 × 7 = 49 cặp trạng thái. Với các cặp được khai báo trong `TRANSITIONS`, kiểm tra `assertTransition(from, to)` không ném exception. Với các cặp còn lại, kiểm tra hàm ném `ConflictException`.

Đồng thời, cần kiểm tra riêng các trạng thái kết thúc `COMPLETED` và `CANCELLED`, bảo đảm không cho phép chuyển sang trạng thái khác theo State Machine hiện tại.

### 1.4 Đồng thời

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| TC-ST-24 | Hai request đồng thời chuyển cùng một đơn từ `PENDING`, một sang `PAID`, một sang `CANCELLED` | Chỉ một request được cập nhật thành công nếu backend có cơ chế cập nhật trạng thái có điều kiện hoặc cơ chế đồng bộ tương đương. Request còn lại phải được xử lý như xung đột; kỳ vọng `409 Conflict` chỉ áp dụng nếu backend ánh xạ tình huống này sang HTTP 409. Xác minh bằng integration test. |

## 2. Tạo đơn (`POST /orders`)

> Các test case dưới đây là thiết kế kiểm thử. Những hành vi chưa được xác nhận cần được kiểm tra với DTO, service, exception filter và cấu hình xác thực thực tế.

| ID | Tình huống | Input | Kết quả mong đợi |
|---|---|---|---|
| TC-CO-01 | Tạo đơn thành công | `userId` hợp lệ, sản phẩm còn hàng, `items` hợp lệ | `201 Created`, đơn có trạng thái `PENDING`, tổng tiền được backend tính đúng |
| TC-CO-02 | Giá do server tính | Client gửi thêm trường `price` hoặc `total` giả | Tổng tiền không được tính dựa trên giá do client tự cung cấp. Nếu cấu hình validation cho phép trường bổ sung, xác minh backend vẫn tính giá theo dữ liệu phía server; nếu cấu hình từ chối trường không được khai báo, request có thể bị từ chối theo quy tắc validation. |
| TC-CO-03 | Chưa đăng nhập | Không gửi JWT | Chỉ kỳ vọng `401` nếu endpoint được cấu hình yêu cầu xác thực; cần xác nhận guard thực tế |
| TC-CO-04 | JWT hết hạn | Token quá hạn | Chỉ kỳ vọng `401` nếu endpoint có xác thực JWT; cần xác nhận cấu hình thực tế |
| TC-CO-05 | Giỏ hàng rỗng | `items: []` | `400 Bad Request`, không tạo đơn |
| TC-CO-06 | Số lượng bằng 0 | `quantity: 0` | `400 Bad Request`, không tạo đơn |
| TC-CO-07 | Số lượng âm hoặc không phải số nguyên | `quantity: -1` hoặc `quantity: 1.5` | `400 Bad Request`, không tạo đơn |
| TC-CO-08 | Kích cỡ không hợp lệ | `size: "XL"` | `400 Bad Request`, không tạo đơn |
| TC-CO-09 | Sản phẩm không tồn tại | `productId` không tồn tại trong DB | Request bị từ chối; xác minh mã lỗi thực tế là `400` hay `404`, không tạo đơn |
| TC-CO-10 | Topping không tồn tại hoặc không hợp lệ | `toppingIds` chứa ID không hợp lệ | Request bị từ chối, không tạo đơn; xác minh mã lỗi theo service thực tế |
| TC-CO-11 | Thiếu `userId` hoặc `userId` không hợp lệ | `userId` không hợp lệ | Request bị từ chối, không tạo đơn; xác minh mã lỗi theo validation và service |
| TC-CO-12 | Hết tồn kho sản phẩm | `quantity` lớn hơn tồn kho | Request bị từ chối; xác minh mã HTTP theo exception thực tế và bảo đảm tồn kho không bị âm |
| TC-CO-13 | Hết hàng ở sản phẩm thứ hai | Sản phẩm thứ nhất đủ hàng, sản phẩm thứ hai không đủ | Request thất bại; transaction rollback, tồn kho sản phẩm thứ nhất không bị trừ nếu transaction bao gồm cả hai cập nhật |
| TC-CO-14 | Đặt đồng thời món cuối | `stock = 1`, hai request cùng đặt `quantity = 1` | Tối đa một đơn thành công; tồn kho không âm. Mã lỗi của request thất bại cần xác minh theo cách backend xử lý cạnh tranh |
| TC-CO-15 | Nhiều request đặt đồng thời | `stock = 5`, mười request cùng đặt `quantity = 1` | Tối đa năm request thành công; tồn kho không âm và không bán vượt số lượng có sẵn |
| TC-CO-16 | Lỗi DB khi tạo `OrderItem` | Giả lập lỗi trong transaction | Request thất bại; transaction rollback, không lưu đơn hoặc cập nhật tồn kho dở dang |
| TC-CO-17 | Giá trị `userId` từ client | Body chứa `userId` của người dùng khác | Với backend hiện tại, cần xác minh cơ chế xác thực và phân quyền trước khi kết luận. Nếu chuyển sang lấy danh tính từ JWT, phải bảo đảm đơn thuộc về người dùng đã xác thực.

## 3. Hủy đơn và hết hạn

> Các test case dưới đây là thiết kế kiểm thử. Endpoint hủy đơn, scheduler hết hạn, hoàn tiền và xử lý loyalty cần được xác nhận trước khi triển khai test.

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| TC-CX-01 | Hủy đơn ở trạng thái `PENDING` | Nếu endpoint hủy đơn được triển khai và yêu cầu hợp lệ, đơn chuyển sang `CANCELLED`; tồn kho được xử lý theo quy tắc đã thống nhất |
| TC-CX-02 | Hủy đơn ở trạng thái `PAID` | Chỉ cho phép nếu State Machine chấp thuận; quy tắc hoàn tiền, xử lý tồn kho và loyalty cần được thống nhất với nhóm |
| TC-CX-03 | Hủy đơn ở trạng thái `PREPARING` | Từ chối chuyển trạng thái theo State Machine; dự kiến `409 Conflict` nếu backend sử dụng quy ước này |
| TC-CX-04 | Đơn `PENDING` quá 15 phút | Chỉ áp dụng khi cơ chế hết hạn và scheduler được triển khai; nếu có, đơn hết hạn chuyển sang trạng thái đã thống nhất và tồn kho được xử lý đúng |
| TC-CX-05 | Thử thanh toán đơn đã hết hạn | Nếu cơ chế hết hạn được triển khai, từ chối thanh toán và bảo đảm đơn không chuyển sang `PAID` sau khi đã hết hạn hoặc bị hủy |

### Ghi chú

- Endpoint `POST /orders/:id/cancel` hiện là draft trong API contract, chưa được xác nhận đã triển khai.
- Quy tắc `PAID → CANCELLED` cần thống nhất với nhóm Payment, đặc biệt là việc hoàn tiền.
- Thời hạn 15 phút và scheduler chỉ là yêu cầu dự kiến cho đến khi được xác nhận trong nghiệp vụ và backend.
- Các mã HTTP trong bảng là kết quả mong đợi cần đối chiếu với implementation thực tế.

## 4. Ma trận kiểm tra khớp (Flow ↔ State Machine)

| Flow | Case liên quan | Trạng thái đơn / Kết quả mong đợi |
|---|---|---|
| Main flow tạo đơn | TC-CO-01 | Tạo đơn thành công, trạng thái ban đầu là `PENDING` |
| Dữ liệu tạo đơn không hợp lệ | TC-CO-05 đến TC-CO-11 | Request bị từ chối; không tạo đơn thành công |
| Thiếu hoặc hết hạn JWT | TC-CO-03, TC-CO-04 | Kỳ vọng `401` nếu endpoint được cấu hình yêu cầu xác thực |
| Hết tồn kho hoặc có cạnh tranh đặt hàng | TC-CO-12 đến TC-CO-15 | Request không hợp lệ hoặc thất bại theo implementation; tồn kho không âm và không bán vượt số lượng có sẵn |
| Lỗi trong transaction tạo đơn | TC-CO-13, TC-CO-16 | Transaction rollback theo thiết kế; không để lại dữ liệu hoặc cập nhật tồn kho dở dang |
| Thanh toán thành công | TC-ST-01 | `PENDING → PAID`; cần kiểm thử tích hợp với luồng thanh toán khi được triển khai |
| Thanh toán thất bại | TC-ST-02 | `PENDING → PAYMENT_FAILED`; cần xác nhận cách xử lý lỗi thanh toán |
| Thử lại sau thanh toán thất bại | TC-ST-04 | `PAYMENT_FAILED → PENDING`; áp dụng nếu nghiệp vụ cho phép thử lại |
| Hủy đơn | TC-ST-03, TC-ST-05, TC-ST-07; TC-CX-01 đến TC-CX-03 | Chuyển sang `CANCELLED` chỉ khi trạng thái nguồn và quy tắc nghiệp vụ cho phép |
| Hết hạn đơn | TC-CX-04, TC-CX-05 | Chỉ kiểm thử khi cơ chế hết hạn và scheduler được triển khai |
| Chuyển trạng thái không hợp lệ | TC-ST-10 đến TC-ST-23 | Từ chối chuyển trạng thái; trạng thái hiện tại không thay đổi |
| Kiểm thử đầy đủ State Machine | TC-ST-24 và ma trận 7 × 7 tại mục 1.3 | Kiểm tra cạnh tranh cập nhật và toàn bộ cặp trạng thái hợp lệ/không hợp lệ theo State Machine |

### Ghi chú

- Mã HTTP thực tế phải được đối chiếu với exception mà backend ném ra và cơ chế xử lý exception.
- Những luồng thanh toán, hủy đơn và hết hạn chưa được xác nhận triển khai chỉ là các trường hợp kiểm thử dự kiến.
- Với mọi request tạo đơn thất bại, cần kiểm tra cả dữ liệu đơn hàng và tồn kho trong cơ sở dữ liệu, không chỉ kiểm tra mã HTTP.