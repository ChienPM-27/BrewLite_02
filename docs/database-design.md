# 🗄️ BẢNG THIẾT KẾ CƠ SỞ DỮ LIỆU & SƠ ĐỒ UML DATABASE (BREWLITE - FULL SCHEMA)

Tài liệu này đặc tả toàn bộ mô hình dữ liệu quan hệ (Relational Database) và Sơ đồ Lớp / Thực thể chuẩn UML của hệ thống **BrewLite**, đã được kiểm tra và đồng bộ trực tiếp với **PostgreSQL qua Prisma ORM 6.19**, đáp ứng trọn vẹn 100% yêu cầu cho cả 3 Sprint.

---

## 1. SƠ ĐỒ UML DATABASE DIAGRAM (MERMAID)

```mermaid
classDiagram
    direction LR

    class User {
        +String id PK
        +String email UK
        +String passwordHash
        +String fullName
        +Int loyaltyPoints = 0
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Category {
        +String id PK
        +String name UK
        +String slug UK
        +Int displayOrder = 0
    }

    class Product {
        +String id PK
        +String categoryId FK
        +String name
        +Decimal basePrice
        +String imageUrl
        +Int stock = 0 (DEPRECATED)
        +Int version = 0 (DEPRECATED)
        +Boolean isAvailable = true
    }

    class ProductSizePrice {
        +String id PK
        +String productId FK
        +ProductSize size (S/M/L)
        +Decimal priceAdjustment
    }

    class Topping {
        +String id PK
        +String name UK
        +Decimal price
        +Int stock = 100 (DEPRECATED)
        +Boolean isAvailable = true
    }

    class Promotion {
        +String id PK
        +String code UK (WELCOME10/GIAM15K)
        +Int discountPercent
        +Decimal discountAmount
        +Decimal maxDiscount
        +Decimal minOrderAmount
        +Boolean isActive = true
    }

    class Order {
        +String id PK
        +Int orderNumber UK (#1042 autoincrement)
        +String userId FK
        +String promotionId FK
        +OrderStatus status = PENDING
        +Decimal totalAmount
        +Decimal discountAmount = 0
        +Decimal finalAmount
        +Int pointsEarned = 0
        +DateTime paidAt
        +Int version = 0 (StateLock)
    }

    class OrderItem {
        +String id PK
        +String orderId FK
        +String productId FK
        +ProductSize size = M
        +Int quantity = 1
        +Decimal unitPrice
        +Decimal lineTotal
    }

    class OrderItemTopping {
        +String id PK
        +String orderItemId FK
        +String toppingId FK
        +Decimal price
    }

    class Payment {
        +String id PK
        +String orderId FK (1-N retry)
        +String idempotencyKey UK
        +String requestHash
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status = PENDING
        +String failureReason
        +String transactionRef
        +DateTime createdAt
    }

    class LoyaltyTransaction {
        +String id PK
        +String userId FK
        +String orderId FK
        +Int points
        +LoyaltyTransactionType type (EARNED/SPENT)
        +String reason
        +DateTime createdAt
    }

    class OrderStatusHistory {
        +String id PK
        +String orderId FK
        +OrderStatus fromStatus
        +OrderStatus toStatus
        +String changedBy
        +String reason
        +DateTime createdAt
    }

    class Ingredient {
        +String id PK
        +String name UK
        +String unit
        +Int stock = 0
        +Int minThreshold = 50
        +Boolean isAvailable = true
        +DateTime createdAt
        +DateTime updatedAt
    }

    class ProductRecipe {
        +String id PK
        +String productId FK
        +ProductSize size = M
        +String ingredientId FK
        +Int quantity
    }

    class ToppingRecipe {
        +String id PK
        +String toppingId FK
        +String ingredientId FK
        +Int quantity
    }

    class OrderIngredientUsage {
        +String id PK
        +String orderId FK
        +String ingredientId FK
        +Int quantity
    }

    Category "1" o-- "0..*" Product : classifies
    Product "1" *-- "1..*" ProductSizePrice : sizes
    User "1" *-- "0..*" Order : places
    User "1" *-- "0..*" LoyaltyTransaction : owns
    Promotion "1" o-- "0..*" Order : applied_to
    Order "1" *-- "1..*" OrderItem : contains
    Order "1" *-- "0..*" Payment : payments (1-N retry)
    Order "1" *-- "0..*" OrderStatusHistory : audits
    Product "1" <-- "0..*" OrderItem : references
    OrderItem "1" *-- "0..*" OrderItemTopping : includes
    Topping "1" <-- "0..*" OrderItemTopping : references
    Product "1" *-- "0..*" ProductRecipe : recipes
    Ingredient "1" <-- "0..*" ProductRecipe : ingredient
    Topping "1" *-- "0..*" ToppingRecipe : recipes
    Ingredient "1" <-- "0..*" ToppingRecipe : ingredient
    Order "1" *-- "0..*" OrderIngredientUsage : usages
    Ingredient "1" <-- "0..*" OrderIngredientUsage : ingredient
```

---

## 2. BẢNG MÔ TẢ CHI TIẾT 10 THỰC THỂ CỐT LÕI (FULL SCHEMA)

### 2.1. Bảng `users` (Tài khoản người dùng & Tích lũy)
* **Khóa chính:** `id` (`cuid`, varchar 36)
* **Nghiệp vụ:** Quản lý đăng ký, đăng nhập JWT (Task 7) và lưu điểm thưởng tích lũy (Task 10).

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Định danh duy nhất người dùng. |
| `email` | `VARCHAR(255)` | **UK, NOT NULL** | Email đăng nhập hệ thống. |
| `password_hash` | `VARCHAR(255)` | **NOT NULL** | Mật khẩu băm an toàn bằng `bcrypt` (Salt round 10). |
| `full_name` | `VARCHAR(100)` | NULLABLE | Tên hiển thị của khách hàng. |
| `loyalty_points`| `INTEGER` | **DEFAULT 0** | Số dư điểm thưởng hiện tại. |
| `created_at` | `TIMESTAMP` | **DEFAULT NOW()** | Thời gian đăng ký. |
| `updated_at` | `TIMESTAMP` | **DEFAULT NOW()** | Thời gian cập nhật gần nhất. |

---

### 2.2. Bảng `categories` (Phân loại đồ uống)
| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã danh mục. |
| `name` | `VARCHAR(100)` | **UK, NOT NULL** | Tên loại: "Cà phê", "Trà & Trái cây". |
| `slug` | `VARCHAR(100)` | **UK, NOT NULL** | Đường dẫn thân thiện (`ca-phe`, `tra-trai-cay`). |
| `display_order` | `INTEGER` | **DEFAULT 0** | Thứ tự hiển thị trên Menu. |

---

### 2.3. Bảng `products` (Danh mục sản phẩm & Tồn kho Concurrency)
* **Nghiệp vụ:** Hiển thị Menu (Task 2, 3), kiểm soát tồn kho (trước đây dùng stock, nay chuyển sang quản lý theo nguyên liệu qua Change Request CR-01).

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã sản phẩm. |
| `category_id` | `VARCHAR(36)` | **FK -> categories(id)** | Phân loại danh mục. |
| `name` | `VARCHAR(150)` | **NOT NULL** | Tên món (Cà phê sữa đá, Americano, Cappuccino, Trà đào). |
| `base_price` | `DECIMAL(12,0)`| **NOT NULL** | Giá gốc đồ uống (VNĐ). |
| `image_url` | `VARCHAR(500)` | NULLABLE | Link ảnh món đồ uống. |
| `stock` | `INTEGER` | **DEFAULT 0** | **DEPRECATED — không còn dùng để trừ kho (CR ingredients).** Giữ nguyên tương thích, xóa ở GĐ2. |
| `version` | `INTEGER` | **DEFAULT 0** | **DEPRECATED — không còn dùng cho Optimistic Lock tồn kho (CR ingredients).** Giữ nguyên tương thích, xóa ở GĐ2. |
| `is_available` | `BOOLEAN` | **DEFAULT TRUE** | Còn bán hay tạm hết. |

---

### 2.4. Bảng `product_size_prices` (Phụ phí theo Size S/M/L - Task 4)
| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Định danh dòng giá size. |
| `product_id` | `VARCHAR(36)` | **FK -> products(id)** | Món đồ uống áp dụng. |
| `size` | `ENUM` | **'S', 'M', 'L'** | Size ly. |
| `price_adjustment`| `DECIMAL(12,0)`| **DEFAULT 0** | Số tiền phụ thu (S: +0đ, M: +5.000đ, L: +10.000đ). |

---

### 2.5. Bảng `toppings` (Danh mục Topping chọn thêm - Task 4)
| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã topping. |
| `name` | `VARCHAR(100)` | **UK, NOT NULL** | Tên topping: "Trân châu trắng", "Kem Cheese", "Đào miếng". |
| `price` | `DECIMAL(12,0)`| **NOT NULL** | Đơn giá thêm (5.000đ, 10.000đ, 8.000đ). |
| `stock` | `INTEGER` | **DEFAULT 100** | **DEPRECATED — không còn dùng để trừ kho (CR ingredients).** Giữ nguyên tương thích, xóa ở GĐ2. |
| `is_available` | `BOOLEAN` | **DEFAULT TRUE** | Trạng thái còn topping không. |

---

### 2.6. Bảng `promotions` (Mã giảm giá Khuyến mãi - Task 10)
| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã bản ghi voucher. |
| `code` | `VARCHAR(50)` | **UK, NOT NULL** | Mã nhập: `WELCOME10`, `GIAM15K`. |
| `description` | `VARCHAR(255)` | NULLABLE | Mô tả thể lệ khuyến mãi. |
| `discount_percent`| `INTEGER` | NULLABLE | Phần trăm giảm giá (ví dụ 10%). |
| `discount_amount` | `DECIMAL(12,0)`| NULLABLE | Số tiền giảm cố định (ví dụ 15.000đ). |
| `max_discount` | `DECIMAL(12,0)`| NULLABLE | Mức giảm tối đa (ví dụ 20.000đ). |
| `min_order_amount`| `DECIMAL(12,0)`| **DEFAULT 0** | Giá trị đơn tối thiểu để áp dụng mã. |
| `is_active` | `BOOLEAN` | **DEFAULT TRUE** | Mã còn hiệu lực kích hoạt hay không. |

---

### 2.7. Bảng `orders` (Quản lý đơn hàng & State Machine)
| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã UUID nội bộ của đơn. |
| `order_number` | `INTEGER` | **UK, AUTOINCREMENT** | Mã đơn hiển thị giao diện: `#1001`, `#1042`. |
| `user_id` | `VARCHAR(36)` | **FK -> users(id)** | Khách hàng đặt đơn. |
| `promotion_id` | `VARCHAR(36)` | **FK -> promotions(id)** | Mã voucher được áp dụng (nếu có). |
| `status` | `ENUM` | **DEFAULT 'PENDING'** | Trạng thái: `PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `PAYMENT_FAILED`, `CANCELLED`. |
| `total_amount` | `DECIMAL(12,0)`| **NOT NULL** | Tổng tiền tạm tính ban đầu. |
| `discount_amount`| `DECIMAL(12,0)`| **DEFAULT 0** | Số tiền được giảm giá. |
| `final_amount` | `DECIMAL(12,0)`| **NOT NULL** | Số tiền thực trả (`totalAmount - discountAmount`). |
| `points_earned` | `INTEGER` | **DEFAULT 0** | Số điểm tích lũy được sau khi đơn `PAID`. |
| `paid_at` | `TIMESTAMP` | NULLABLE | Thời điểm thanh toán thành công. |
| `version` | `INTEGER` | **DEFAULT 0** | Khóa phiên bản chống xung đột trạng thái đơn hàng. |

---

### 2.8. Bảng `order_items` & `order_item_toppings` (Chi tiết dòng đơn)
* Lưu trữ từng ly nước được đặt, size đã chọn và mảng các topping liên kết qua bảng trung gian `order_item_toppings`.

---

### 2.9. Bảng `payments` (Lịch sử thanh toán & Idempotency - Task 8 & 10)
* **Khóa chính:** `id` (CUID)
* **Quan hệ:** **1 Order có nhiều Payment (1–N)**: Hỗ trợ trường hợp thanh toán thất bại lần 1, khách hàng thực hiện thanh toán lại mà không vi phạm ràng buộc Unique.

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã giao dịch thanh toán nội bộ. |
| `order_id` | `VARCHAR(36)` | **FK -> orders(id)** | Đơn hàng cần thanh toán. |
| `idempotency_key`| `VARCHAR(64)` | **UK, NOT NULL** | **Khóa Idempotency:** Ngăn chặn trừ tiền 2 lần khi gửi cùng request. |
| `request_hash` | `VARCHAR(64)` | NULLABLE | Hash nội dung request để kiểm tra payload. |
| `amount` | `DECIMAL(12,0)`| **NOT NULL** | Số tiền giao dịch. |
| `method` | `ENUM` | **'E_WALLET', 'BANK_CARD'** | Phương thức thanh toán (Ví / Thẻ). |
| `status` | `ENUM` | **'PENDING', 'SUCCESS', 'FAILED'** | Trạng thái giao dịch. |
| `failure_reason` | `VARCHAR(255)`| NULLABLE | Nguyên nhân lỗi khi thất bại. |
| `transaction_ref`| `VARCHAR(100)` | NULLABLE | Mã đối soát từ Cổng thanh toán. |

---

### 2.10. Bảng `loyalty_transactions` & `order_status_history` (Audit Trail)
* `loyalty_transactions`: Lưu lịch sử cộng/trừ điểm thưởng của khách sau khi đơn `PAID`.
* `order_status_history`: Lưu vết audit lịch sử chuyển trạng thái đơn (`PENDING` -> `PAID` -> `PREPARING` -> `READY` -> `COMPLETED`) kèm người thực hiện và lý do.

---

### 2.11. Bảng `ingredients` (Nguyên liệu kho & Tồn kho thực tế - CR ingredients)
* **Nghiệp vụ:** Quản lý số lượng tồn kho thực tế của các loại nguyên liệu pha chế (hạt cà phê, sữa đặc, búp trà, siro,...).
* **Trừ kho nguyên tử:** Áp dụng `UPDATE ingredients SET stock = stock - :qty WHERE id = :id AND stock >= :qty` (D10). Không dùng cột version để tránh xung đột 400 giả mạo khi nhiều đơn đồng thời.

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã nguyên liệu (CUID). |
| `name` | `VARCHAR(150)` | **UK, NOT NULL** | Tên nguyên liệu ("Hạt cà phê Robusta", "Sữa đặc", "Siro đào",...). |
| `unit` | `VARCHAR(20)` | **NOT NULL** | Đơn vị tính chuẩn: `g`, `ml`, `piece`. |
| `stock` | `INTEGER` | **DEFAULT 0, NOT NULL** | Số lượng tồn kho hiện tại (lưu số nguyên). |
| `min_threshold` | `INTEGER` | **DEFAULT 50, NOT NULL** | Ngưỡng tồn kho tối thiểu để cảnh báo sắp hết hàng. |
| `is_available` | `BOOLEAN` | **DEFAULT TRUE, NOT NULL** | Cờ bật/tắt nhập kho & kinh doanh nguyên liệu. |
| `created_at` | `TIMESTAMP` | **DEFAULT NOW()** | Thời điểm tạo nguyên liệu. |
| `updated_at` | `TIMESTAMP` | **DEFAULT NOW()** | Thời điểm cập nhật cuối. |

---

### 2.12. Bảng `product_recipes` (Công thức sản phẩm theo Size S/M/L - CR ingredients)
* **Nghiệp vụ:** Định lượng tiêu hao nguyên liệu cho từng kích cỡ sản phẩm (Size S, M, L).
* **Ràng buộc duy nhất:** `UNIQUE (product_id, size, ingredient_id)`.

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã dòng công thức (CUID). |
| `product_id` | `VARCHAR(36)` | **FK -> products(id), NOT NULL** | Món áp dụng công thức (onDelete: Cascade). |
| `size` | `ENUM` | **'S', 'M', 'L', DEFAULT 'M'** | Cỡ ly tương ứng. |
| `ingredient_id` | `VARCHAR(36)` | **FK -> ingredients(id), NOT NULL**| Nguyên liệu tiêu hao. |
| `quantity` | `INTEGER` | **NOT NULL** | Định mức tiêu hao (số nguyên g, ml, piece). |

---

### 2.13. Bảng `topping_recipes` (Công thức định mức Topping - CR ingredients)
* **Nghiệp vụ:** Định lượng tiêu hao nguyên liệu khi khách hàng chọn thêm topping.
* **Ràng buộc duy nhất:** `UNIQUE (topping_id, ingredient_id)`.

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã dòng công thức topping (CUID). |
| `topping_id` | `VARCHAR(36)` | **FK -> toppings(id), NOT NULL** | Topping áp dụng công thức (onDelete: Cascade). |
| `ingredient_id` | `VARCHAR(36)` | **FK -> ingredients(id), NOT NULL**| Nguyên liệu tiêu hao. |
| `quantity` | `INTEGER` | **NOT NULL** | Định mức tiêu hao (số nguyên g, ml, piece). |

---

### 2.14. Bảng `order_ingredient_usages` (Snapshot tiêu hao nguyên liệu đơn hàng - CR ingredients)
* **Nghiệp vụ:** Lưu lại snapshot chính xác tổng lượng nguyên liệu đã trừ của đơn hàng tại thời điểm `POST /orders`. Dùng để hoàn kho khi `POST /orders/:id/cancel`, không phụ thuộc vào công thức sản phẩm tại thời điểm hủy.
* **Ràng buộc duy nhất:** `UNIQUE (order_id, ingredient_id)`.

| Cột | Kiểu | Ràng buộc | Mục đích nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PK** | Mã dòng snapshot (CUID). |
| `order_id` | `VARCHAR(36)` | **FK -> orders(id), NOT NULL** | Đơn hàng tiêu hao (onDelete: Cascade). |
| `ingredient_id` | `VARCHAR(36)` | **FK -> ingredients(id), NOT NULL**| Nguyên liệu tiêu hao. |
| `quantity` | `INTEGER` | **NOT NULL** | Tổng số lượng nguyên liệu đã trừ của đơn hàng. |
