# 2. Feature Specification

## 2.1. Overview

| Attribute | Description |
|---|---|
| **Feature name** | Product Detail (with Customization) |
| **Module** | Ordering / Product |
| **Type** | Functional Feature |
| **Priority** | High |
| **Description** | Cho phép người dùng xem chi tiết sản phẩm, tùy chỉnh (BA/Design) món đồ (size, topping...), xem giá và đặt hàng bằng phương thức thanh toán không dùng tiền mặt. |

## 2.2. Actors

| Actor | Description |
|---|---|
| **Customer** | Người dùng ứng dụng, xem sản phẩm, tùy chỉnh, đặt hàng và thanh toán. |
| **Payment Provider (Non-cash)** | Dịch vụ thanh toán không dùng tiền mặt (VD: MoMo, ZaloPay, VNPay, thẻ ngân hàng, ...). |

## 2.3. Related Use Cases

| Use Case | Description |
|---|---|
| **View Product Detail** | Xem thông tin chi tiết sản phẩm. |
| **Customize Product (BA/Design)** | Tùy chỉnh size, topping, ... |
| **Get Product Detail API** | Lấy thông tin sản phẩm từ backend. |
| **Calculate Pricing** | Tính giá dựa trên lựa chọn của người dùng. |
| **Place Order** | Tạo đơn hàng. |
| **Make Non-cash Payment** | Thanh toán không dùng tiền mặt. |

## 2.4. Flow

| Step | Flow |
|---|---|
| 1 | Người dùng mở ứng dụng và truy cập trang sản phẩm. |
| 2 | Người dùng xem chi tiết sản phẩm (hình ảnh, mô tả, giá cơ bản). |
| 3 | Người dùng tùy chỉnh món (chọn size, topping, ...). |
| 4 | Hệ thống tính giá cuối cùng và hiển thị cho người dùng. |
| 5 | Người dùng thêm vào giỏ hàng và tiến hành đặt hàng. |
| 6 | Người dùng chọn phương thức thanh toán không dùng tiền mặt. |
| 7 | Hệ thống xử lý thanh toán qua Payment Provider. |
| 8 | Đơn hàng được xác nhận và hiển thị trạng thái cho người dùng. |

## 2.5. Detailed Specifications

| Component | Spec |
|---|---|
| **Frontend (Detail)** | - Hiển thị hình ảnh, tên, mô tả, giá cơ bản của sản phẩm.<br>- Cho phép chọn size (S/M/L/XL...).<br>- Cho phép chọn topping (thêm/loại bỏ).<br>- Hiển thị giá cập nhật theo lựa chọn.<br>- Nút "Thêm vào giỏ hàng" / "Đặt ngay". |
| **Frontend (Size)** | - Danh sách size hiển thị dưới dạng lựa chọn (radio/button).<br>- Có thể có phụ phí theo size (nếu có). |
| **Frontend (Topping)** | - Danh sách topping dạng checkbox.<br>- Hiển thị giá từng topping (nếu có).<br>- Có thể giới hạn số lượng topping (nếu cần). |
| **Backend (GET /products/:id)** | - Trả về thông tin sản phẩm (tên, mô tả, hình ảnh, giá cơ bản, danh sách size, topping, ...).<br>- Response dạng JSON. |
| **Backend (Pricing)** | - Tính giá dựa trên size, topping, số lượng.<br>- Trả về tổng giá cuối cùng.<br>- Áp dụng khuyến mãi (nếu có). |

## 2.6. API Example

### API Endpoint

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products/:id` | Lấy thông tin chi tiết sản phẩm (including size, topping, base price). |

### Example Response (JSON)

```json
{
  "id": 1,
  "name": "Cà phê sữa đá",
  "description": "Cà phê nguyên chất kết hợp sữa đặc.",
  "basePrice": 45000,
  "images": ["..."],
  "sizes": [
    {
      "id": "S",
      "name": "Nhỏ",
      "priceAdjustment": 0
    },
    {
      "id": "M",
      "name": "Vừa",
      "priceAdjustment": 5000
    },
    {
      "id": "L",
      "name": "Lớn",
      "priceAdjustment": 10000
    }
  ],
  "toppings": [
    {
      "id": 1,
      "name": "Trân châu",
      "price": 5000
    },
    {
      "id": 2,
      "name": "Thạch",
      "price": 4000
    }
  ],
  "status": "available"
}
```

## 2.7. Non-Functional Requirements

- Hệ thống phản hồi nhanh (< 2s cho API product detail).
- Bảo mật thông tin thanh toán, tuân thủ tiêu chuẩn của Payment Provider.
- Hỗ trợ đa dạng phương thức thanh toán không dùng tiền mặt.