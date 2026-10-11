# API CONTRACT: CART VALIDATION & CHECKOUT

Mặc dù Giỏ hàng không có API `/cart` riêng, thao tác quan trọng nhất của phân hệ này là chuẩn bị Payload đúng chuẩn để giao tiếp với `POST /api/v1/orders`. Tài liệu này là "Hợp đồng giao tiếp" giữa Cart (Frontend) và Order (Backend).

## 1. Endpoint giao tiếp chính
* **Method:** `POST`
* **URL:** `/api/v1/orders`
* **Authorization:** Bearer Token (Yêu cầu đăng nhập JWT)
* **Nhiệm vụ:** Nhận dữ liệu giỏ hàng, validate (kiểm tra định dạng, tồn kho, giá trị), và khởi tạo đơn hàng.

---

## 2. Request Payload (Giỏ hàng gửi xuống)
Được sinh ra từ trạng thái `CartState.items` trong Zustand của Frontend.

```json
{
  "items": [
    {
      "productId": "cluid_product_001",
      "size": "M",
      "toppingIds": ["cluid_topping_01", "cluid_topping_02"],
      "quantity": 2
    }
  ]
}
```

---

## 3. Cấu trúc Response (Tuân thủ TransformInterceptor)

### 3.1. Kịch bản Thành công (Tạo đơn OK)
* **Status Code:** `201 Created`
* **Mô tả:** Backend lưu đơn thành công, trả về mã đơn để Frontend chuyển hướng sang màn hình Thanh toán.

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "orderId": "cluid_order_999",
    "status": "PENDING",
    "totalAmount": 125000
  },
  "timestamp": "2026-10-06T10:00:00.000Z"
}
```

### 3.2. Kịch bản Lỗi Class-Validator (Dữ liệu rác)
* **Status Code:** `400 Bad Request`
* **Mô tả:** Dữ liệu Frontend gửi lên không hợp lệ (số lượng âm, sai format ID, truyền thiếu items). Lỗi bị chặn ngay tại DTO, chưa gọi xuống Database.

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "số lượng của sản phẩm đầu tiên không nhỏ hơn 1",
    "kích cỡ bắc buộc là một trong các giá trị : S, M, L"
  ],
  "timestamp": "2026-10-06T10:00:00.000Z",
  "path": "/api/v1/orders"
}
```

### 3.3. Kịch bản Lỗi Logic Database (Hết hàng / Lệch giá)
* **Status Code:** `400 Bad Request`
* **Mô tả:** Dữ liệu đúng định dạng nhưng khi kiểm tra dưới DB phát hiện sản phẩm đã hết hàng (`stock < quantity`) hoặc admin vừa đổi giá. Backend từ chối tạo đơn.

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Sản phẩm Latte (Size M) đã hết tồn kho.",
  "timestamp": "2026-10-06T10:00:00.000Z",
  "path": "/api/v1/orders"
}
```