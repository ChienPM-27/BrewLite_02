# API CONTRACT - PRODUCT CATALOG
## 1. Tổng quan
API cung cấp danh sách sản phẩm đang được mở bán để Frontend hiển thị trên trang Menu.

**Method**: `GET`
**Endpoint**: `/api/v1/products`
**Success Status**: `200 OK`
> **Lưu ý:** Theo triển khai hiện tại, Backend lọc `isAvailable = true` và sắp xếp tên sản phẩm tăng dần. Tìm kiếm theo tên và lọc theo danh mục được thực hiện ở Frontend, không gửi query parameters lên API.`

## 2. Request
### 2.1. HTTP Request
**GET /api/v1/products**
**Base URL**: http://localhost:4000
**Request Body**: Không có.
**Query Parameters**: Không có.

### 2.2. Mô tả
Frontend gửi request đến Backend để lấy danh sách sản phẩm đang được mở bán. Backend truy vấn dữ liệu và trả về danh sách sản phẩm dưới dạng JSON.
Tìm kiếm theo tên và lọc theo danh mục được thực hiện ở Frontend trên danh sách sản phẩm đã tải về.

## 3. Success Response
### 3.1. HTTP Status
`200 OK`
### 3.2. Response Body mẫu

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "cmv19kpze000c94rcbvzmlrfz",
      "name": "Americano",
      "basePrice": 40000,
      "imageUrl": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
      "isAvailable": true,
      "categoryName": "Cà phê",
      "sizePrices": [
        {
          "size": "S",
          "priceAdjustment": 0
        },
        {
          "size": "M",
          "priceAdjustment": 5000
        },
        {
          "size": "L",
          "priceAdjustment": 10000
        }
      ]
    },
    {
      "id": "cmv19kpzp000h94rc3af9h2y8",
      "name": "Cappuccino",
      "basePrice": 45000,
      "imageUrl": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600",
      "isAvailable": true,
      "categoryName": "Cà phê",
      "sizePrices": [
        {
          "size": "S",
          "priceAdjustment": 0
        },
        {
          "size": "M",
          "priceAdjustment": 5000
        },
        {
          "size": "L",
          "priceAdjustment": 10000
        }
      ]
    },
    {
      "id": "cmv19kpye000794rc6vgebmpz",
      "name": "Cà phê sữa đá",
      "basePrice": 35000,
      "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600",
      "isAvailable": true,
      "categoryName": "Cà phê",
      "sizePrices": [
        {
          "size": "S",
          "priceAdjustment": 0
        },
        {
          "size": "M",
          "priceAdjustment": 5000
        },
        {
          "size": "L",
          "priceAdjustment": 10000
        }
      ]
    },
    {
      "id": "cmv19kpzz000m94rcy5xv6qr4",
      "name": "Trà đào cam sả",
      "basePrice": 39000,
      "imageUrl": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
      "isAvailable": true,
      "categoryName": "Trà & Trái cây",
      "sizePrices": [
        {
          "size": "S",
          "priceAdjustment": 0
        },
        {
          "size": "M",
          "priceAdjustment": 5000
        },
        {
          "size": "L",
          "priceAdjustment": 10000
        }
      ]
    }
  ],
  "timestamp": "2026-10-11T08:39:03.235Z"
}
```

> Đây là response mẫu dựa trên dữ liệu hiện có. `id` và `timestamp` có thể khác nhau giữa các lần gọi API.


## 4. Error Responses

Khi request thất bại, Backend trả về HTTP status phù hợp với nguyên nhân lỗi. Frontend cần phân biệt lỗi request với trường hợp API trả về danh sách sản phẩm rỗng.

### 4.1. Error Response Body

Cấu trúc JSON phản hồi khi xảy ra lỗi:

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Không thể tải danh sách sản phẩm.",
  "timestamp": "2026-10-11T08:39:03.235Z"
}
```

Trong đó:

- `success`: Cho biết request có thành công hay không; giá trị `false` khi xảy ra lỗi.
- `statusCode`: Mã HTTP phản hồi.
- `message`: Mô tả lỗi.
- `timestamp`: Thời điểm xảy ra lỗi.

### 4.2. Các trường hợp lỗi

| Trường hợp | HTTP Status | Xử lý ở Frontend |
|---|---|---|
| Request không hợp lệ, nếu phát sinh | `400 Bad Request` | Hiển thị thông báo lỗi phù hợp. |
| Lỗi không mong muốn từ Backend | `500 Internal Server Error` | Hiển thị thông báo không thể tải danh sách sản phẩm và nút thử lại. |
| Lỗi mạng hoặc không kết nối được Backend | Không nhận được HTTP response | Hiển thị thông báo kết nối thất bại và nút thử lại. |
| API thành công nhưng `data` là `[]` | `200 OK` | Hiển thị thông báo chưa có sản phẩm; không coi đây là lỗi. |


## 5. Frontend Integration Notes

1. **Gọi API:** Khi mở trang Menu, Frontend gọi `GET /api/v1/products`.
2. **Loading state:** Hiển thị trạng thái tải trong lúc chờ phản hồi từ Backend.
3. **Xử lý response:** Khi request thành công, lấy danh sách sản phẩm từ trường `data`.
4. **Hiển thị sản phẩm:** Nếu `data` có phần tử, hiển thị Product Card tương ứng với từng sản phẩm.
5. **Empty state:** Nếu `data` là mảng rỗng, hiển thị thông báo: “Hiện chưa có sản phẩm nào được mở bán.”
6. **Error state:** Nếu request thất bại, hiển thị thông báo lỗi và nút thử lại.
7. **Tìm kiếm và lọc:** Thực hiện tìm kiếm theo tên và lọc theo danh mục tại Frontend trên danh sách đã tải. Không gửi `search` hoặc `category` lên API trong phiên bản hiện tại.



## 6. Out of Scope / Chưa được hỗ trợ

- Query parameters tìm kiếm hoặc lọc danh mục ở Backend.
- Phân trang, sắp xếp tùy chọn hoặc tìm kiếm phía máy chủ.

---

**Ghi chú:** Khi thay đổi endpoint, cấu trúc response hoặc schema dữ liệu, cần cập nhật API Contract tương ứng để bảo đảm Frontend và Backend thống nhất.
