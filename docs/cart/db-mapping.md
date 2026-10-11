# DB MAPPING: CART TO ORDER ENTITIES

**Phân hệ:** Cart (Giỏ hàng)
**Lưu ý:** Giỏ hàng ở trạng thái Local State (Không có bảng `Cart` dưới DB). Bảng này thể hiện cách dữ liệu từ `CartState` (Zustand) được ánh xạ (map) vào các bảng `Order`, `OrderItem`, và `OrderItemTopping` khi gọi API tạo đơn.

## 1. Ánh xạ dữ liệu Giỏ hàng tổng (Cart) -> Bảng Order
| Trường ở Giỏ hàng (Frontend) | Ánh xạ vào Bảng `Order` (Database) | Ghi chú / Quy tắc |
| :--- | :--- | :--- |
| `totalAmount` | `totalAmount` (Decimal) | Backend tự tính lại từ đầu, không tin tưởng hoàn toàn vào số của FE. |
| (Không có) | `status` (Enum) | Mặc định gán là `PENDING` khi vừa tạo từ giỏ hàng. |
| (Không có) | `userId` (String FK) | Backend lấy tự động từ JWT Token của khách hàng (Auth Guard). |

## 2. Ánh xạ từng món trong giỏ (CartItem) -> Bảng OrderItem
| Trường `CartItem` (Frontend) | Ánh xạ vào Bảng `OrderItem` (DB) | Ghi chú / Quy tắc |
| :--- | :--- | :--- |
| `productId` | `productId` (String FK) | Khóa ngoại liên kết tới bảng `Product`. |
| `size` ('S', 'M', 'L') | `size` (String/Enum) | Kích cỡ món. |
| `quantity` | `qty` (Int) | Bắt buộc >= 1. |
| `estimatedUnitPrice` | `lineTotal` (Decimal) | DB sẽ lưu giá chính thức tại thời điểm mua (basePrice + sizePrice + toppingPrice). |

## 3. Ánh xạ Topping -> Bảng OrderItemTopping
| Trường `toppingIds` (Frontend) | Ánh xạ vào Bảng `OrderItemTopping` | Ghi chú / Quy tắc |
| :--- | :--- | :--- |
| `toppingIds[i]` | `toppingId` (String FK) | Khóa ngoại liên kết bảng `Topping`. Mỗi ID sẽ tạo thành 1 dòng tương ứng với `orderItemId`. |