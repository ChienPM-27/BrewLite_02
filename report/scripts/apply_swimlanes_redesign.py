import os
import sys
import time
import urllib.request
import re
import subprocess
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

SWIMLANE_DIAGRAMS = {}

# 1. Product Catalog Activity (3 Swimlanes, compact, large boxes)
SWIMLANE_DIAGRAMS['docs/product-catalog/activity-product-catalog.puml'] = """@startuml activity-product-catalog
title Sơ Đồ Hoạt Động - Phân Hệ Danh Mục Sản Phẩm (Product Catalog)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 14
skinparam activityFontSize 13
skinparam arrowFontSize 11
skinparam activityPadding 8
skinparam wrapWidth 260

skinparam activity {
    BackgroundColor #F0FDF4
    BorderColor #15803D
    FontColor #0F172A
    DiamondBackgroundColor #FEF3C7
    DiamondBorderColor #D97706
    DiamondFontColor #0F172A
}
skinparam ArrowColor #334155

|#FAFAFA|Khách hàng|
|#F8FAFC|Frontend (Next.js)|
|#F1F5F9|Backend (NestJS & DB)|

|Khách hàng|
start
:Mở trang thực đơn (/menu);

|Frontend (Next.js)|
:Hiển thị Loading Skeleton;
:Gửi **GET /api/v1/products**;

|Backend (NestJS & DB)|
:Truy vấn CSDL PostgreSQL (Prisma):\\n- isAvailable = true, stock > 0\\n- Sắp xếp category & name ASC;

if (Truy vấn thành công?) then (Thất bại)
    :Trả về mã lỗi HTTP 500\\n(AllExceptionsFilter);
    |Frontend (Next.js)|
    :Hiển thị thông báo lỗi kết nối\\nvà nút "Thử lại";
    |Khách hàng|
    stop
else (Thành công)
    |Backend (NestJS & DB)|
    :Đóng gói dữ liệu qua TransformInterceptor;
    :Trả về HTTP 200 OK danh sách món;
endif

|Frontend (Next.js)|
:Trích xuất các Tab danh mục (Tất cả, Cà phê...);

if (Danh sách món rỗng?) then (Rỗng)
    :Hiển thị giao diện "Quán chưa mở bán món nào";
    |Khách hàng|
    stop
else (Có món)
    |Frontend (Next.js)|
    :Hiển thị danh sách thẻ đồ uống (ProductCard);
endif

|Khách hàng|
:Nhập từ khóa tìm kiếm hoặc chọn Tab danh mục;

|Frontend (Next.js)|
if (Hình thức tìm kiếm?) then (Chọn Tab danh mục)
    :Lọc nhanh theo CategoryId được chọn;
else (Nhập từ khóa ô search)
    :Chuẩn hóa từ khóa (trim, removeVietnameseTones);
    :Lọc theo tên món không phân biệt dấu/hoa thường;
endif

:Cập nhật danh sách đồ uống trên giao diện;

if (Có kết quả phù hợp?) then (Không có)
    :Hiển thị thông báo "Không tìm thấy sản phẩm"\\nkèm nút "Xóa bộ lọc";
    |Khách hàng|
    if (Bấm "Xóa bộ lọc"?) then (Có)
        |Frontend (Next.js)|
        :Reset từ khóa, chọn lại Tab "Tất cả";
        :Hiển thị lại toàn bộ thực đơn;
    else (Không)
        stop
    endif
else (Có)
endif

|Khách hàng|
:Xem thông tin món (hình ảnh, tên, giá gốc ly S);
:Nhấn vào thẻ món để xem chi tiết;

|Frontend (Next.js)|
:Điều hướng sang trang Chi tiết món (/products/[id]);

|Khách hàng|
stop

@enduml
"""

# 2. Product Detail Activity (3 Swimlanes, compact, large boxes)
SWIMLANE_DIAGRAMS['docs/product-detail/activity-product-detail.puml'] = """@startuml activity-product-detail
title Sơ Đồ Hoạt Động - Phân Hệ Chi Tiết Đồ Uống (Product Detail)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 14
skinparam activityFontSize 13
skinparam arrowFontSize 11
skinparam activityPadding 8
skinparam wrapWidth 260

skinparam activity {
    BackgroundColor #E5F2FF
    BorderColor #2563EB
    FontColor #0F172A
    DiamondBackgroundColor #FEF3C7
    DiamondBorderColor #D97706
    DiamondFontColor #0F172A
}
skinparam ArrowColor #334155

|#FAFAFA|Khách hàng|
|#F8FAFC|Frontend (Next.js)|
|#F1F5F9|Backend (NestJS & DB)|

|Khách hàng|
start
:Mở trang chi tiết món (/products/[id]);

|Frontend (Next.js)|
:Hiển thị Skeleton Loading;
:Gửi **GET /api/v1/products/:id**;

|Backend (NestJS & DB)|
:Truy vấn Product, SizePrices và\\ndanh sách Toppings khả dụng (isAvailable, stock > 0);

if (Sản phẩm có tồn tại?) then (Không tìm thấy)
    :Trả về lỗi 404 Not Found;
    |Frontend (Next.js)|
    :Hiển thị thông báo "Không tìm thấy món"\\nvà nút quay lại thực đơn;
    |Khách hàng|
    stop
else (Tìm thấy)
    |Backend (NestJS & DB)|
    :Đóng gói dữ liệu ProductDetailDto;
    :Trả về HTTP 200 OK kèm sizePrices, toppings;
endif

|Frontend (Next.js)|
:Hiển thị hình ảnh, mô tả và giá gốc ly S;

if (Sản phẩm đang mở bán?) then (Hết hàng / Tạm ngưng)
    :Hiển thị nhãn "Tạm ngưng phục vụ";
    :Vô hiệu hóa nút thêm vào giỏ;
    |Khách hàng|
    stop
else (Đang kinh doanh)
    :Mặc định chọn Size S, số lượng ban đầu = 1;
endif

|Khách hàng|
repeat
    :Tùy biến món:\\n- Chọn Size (S / M / L)\\n- Đánh dấu chọn Topping (tối đa 3 loại)\\n- Tăng/giảm số lượng (1..99);
    |Frontend (Next.js)|
    :Tự động tính lại tổng tiền thời gian thực:\\nđơn giá = basePrice + sizePrice + Σ toppingPrice\\ntổng tiền = đơn giá * số lượng;
    :Cập nhật giá hiển thị trên nút "Thêm vào giỏ";
repeat while (|Khách hàng| Tiếp tục tùy chỉnh?) is (Có)

|Khách hàng|
:Nhấn nút "Thêm vào giỏ hàng";

|Frontend (Next.js)|
:Kiểm tra tính hợp lệ của lựa chọn (quantity 1..99);
:Sinh khóa định danh dòng món duy nhất (cartItemId):\\n`${productId}-${size}-${sortedToppingIds.join('-')}`;

if (Dòng món đã có trong giỏ hàng?) then (Đã có)
    :Tăng số lượng dòng món tương ứng;
else (Chưa có)
    :Thêm bản ghi CartItem mới vào danh sách;
endif

:Zustand cập nhật tổng tiền & badge;
:Lưu đồng bộ trạng thái vào LocalStorage;
:Hiển thị Toast "Đã thêm vào giỏ hàng thành công";

|Khách hàng|
stop

@enduml
"""

# 3. Cart Activity (3 Swimlanes, compact, large boxes)
SWIMLANE_DIAGRAMS['docs/cart/activity-cart.puml'] = """@startuml activity-cart
title Sơ Đồ Hoạt Động - Quản Lý Giỏ Hàng & Chuyển Thanh Toán (Cart Flow)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 14
skinparam activityFontSize 13
skinparam arrowFontSize 11
skinparam activityPadding 8
skinparam wrapWidth 260

skinparam activity {
    BackgroundColor #F0FDF4
    BorderColor #15803D
    FontColor #0F172A
    DiamondBackgroundColor #FEF3C7
    DiamondBorderColor #D97706
    DiamondFontColor #0F172A
}
skinparam ArrowColor #334155

|#FAFAFA|Khách hàng|
|#F8FAFC|Frontend (Next.js & Zustand)|
|#F1F5F9|Backend (NestJS & DB)|

|Khách hàng|
start
:Mở giao diện Giỏ hàng (/cart);

|Frontend (Next.js & Zustand)|
:Đọc trạng thái giỏ từ LocalStorage (Zustand);

if (Giỏ hàng trống?) then (Rỗng)
    :Hiển thị màn hình giỏ hàng trống (Empty State);
    :Vô hiệu hóa nút "Tiến hành đặt hàng";
    |Khách hàng|
    stop
else (Có món)
    |Frontend (Next.js & Zustand)|
    :Hiển thị danh sách món, số lượng, size, topping;
    :Hiển thị tổng tiền tạm tính và số lượng badge;
endif

|Khách hàng|
repeat
    :Thao tác: Tăng/giảm số lượng hoặc xóa món;
    |Frontend (Next.js & Zustand)|
    :Cập nhật State qua cartItemId, tính lại tổng tiền;
    :Đồng bộ tức thì vào LocalStorage ('brewlite_cart');
repeat while (|Khách hàng| Tiếp tục chỉnh sửa?) is (Có)

|Khách hàng|
:Nhấn nút "Tiến hành đặt hàng";

|Frontend (Next.js & Zustand)|
if (Đã đăng nhập và có Token JWT?) then (Chưa)
    :Lưu đường dẫn chuyển tiếp (/cart);
    :Chuyển hướng sang trang Đăng nhập (/auth/login);
    |Khách hàng|
    :Đăng nhập thành công và quay lại /cart;
else (Đã đăng nhập)
endif

|Frontend (Next.js & Zustand)|
if (Đã có đơn PENDING và giỏ không đổi\\n(pendingCartSignature khớp)?) then (Khớp)
    :Tái sử dụng pendingOrderId;
    :Chuyển thẳng sang trang /checkout/payment;
    |Khách hàng|
    stop
else (Chưa có hoặc Giỏ đã đổi)
    if (Đã có pendingOrderId cũ?) then (Có)
        :Gửi POST /api/v1/orders/:id/cancel để hủy đơn cũ;
    else (Không)
    endif
endif

:Chuyển hướng sang trang Xác nhận đơn hàng (/checkout);

|Khách hàng|
stop

@enduml
"""

# 4. Order History Activity (3 Swimlanes, compact, large boxes)
SWIMLANE_DIAGRAMS['docs/order-history/activity-order-history.puml'] = """@startuml activity-order-history
title Sơ Đồ Hoạt Động - Tra Cứu Lịch Sử Đơn Hàng (Order History Flow)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 14
skinparam activityFontSize 13
skinparam arrowFontSize 11
skinparam activityPadding 8
skinparam wrapWidth 260

skinparam activity {
    BackgroundColor #F0FDF4
    BorderColor #15803D
    FontColor #0F172A
    DiamondBackgroundColor #FEF3C7
    DiamondBorderColor #D97706
    DiamondFontColor #0F172A
}
skinparam ArrowColor #334155

|#FAFAFA|Khách hàng|
|#F8FAFC|Frontend (Next.js)|
|#F1F5F9|Backend (NestJS & DB)|

|Khách hàng|
start
:Truy cập trang Lịch sử đơn hàng (/orders);

|Frontend (Next.js)|
if (Đã đăng nhập và có Token JWT?) then (Chưa)
    :Chuyển hướng sang /auth/login?next=/orders;
    |Khách hàng|
    stop
else (Đã đăng nhập)
    |Frontend (Next.js)|
    :Hiển thị Skeleton Loading;
    :Gửi **GET /api/v1/orders/me** (page, limit, status);
endif

|Backend (NestJS & DB)|
:JwtAuthGuard xác thực Token Bearer;

if (Token hợp lệ?) then (Hết hạn / Không hợp lệ)
    :Trả về mã lỗi 401 Unauthorized;
    |Frontend (Next.js)|
    :Xóa Token, yêu cầu đăng nhập lại;
    |Khách hàng|
    stop
else (Hợp lệ)
    |Backend (NestJS & DB)|
    :Trích xuất userId = req.user.sub;
    :Truy vấn CSDL PostgreSQL (Prisma):\\nWHERE userId = :sub (Cô lập dữ liệu người dùng)\\nSắp xếp createdAt DESC, phân trang skip/take;
    :Trả về HTTP 200 OK: { data: orders, pagination };
endif

|Frontend (Next.js)|
if (Danh sách đơn rỗng?) then (Rỗng)
    :Hiển thị màn hình "Bạn chưa có đơn hàng nào"\\nkèm nút "Khám phá thực đơn";
    |Khách hàng|
    stop
else (Có đơn)
    |Frontend (Next.js)|
    :Hiển thị danh sách thẻ đơn hàng (mã #orderNumber,\\nngày giờ, tổng tiền, badge trạng thái PENDING/PAID...);
endif

|Khách hàng|
:Nhấn "Xem chi tiết" một đơn hàng;

|Frontend (Next.js)|
:Gửi **GET /api/v1/orders/:id**;

|Backend (NestJS & DB)|
:Truy vấn chi tiết Order, OrderItem, Toppings;
:Trả về HTTP 200 OK kèm OrderDetail;

|Frontend (Next.js)|
:Mở Modal hiển thị hóa đơn chi tiết đơn hàng;

if (Đơn có trạng thái PENDING?) then (Chưa thanh toán)
    |Khách hàng|
    :Bấm nút "Thanh toán ngay";
    |Frontend (Next.js)|
    :Điều hướng sang trang /checkout/payment?orderId=...;
else (Đã thanh toán)
endif

|Khách hàng|
stop

@enduml
"""

# 5. Order Creation Activity (3 Swimlanes, compact, large boxes)
SWIMLANE_DIAGRAMS['docs/order/activity-order.puml'] = """@startuml activity-order
title Sơ Đồ Hoạt Động - Tạo Đơn Hàng & Khóa Tồn Kho (Order Creation Flow)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 14
skinparam activityFontSize 13
skinparam arrowFontSize 11
skinparam activityPadding 8
skinparam wrapWidth 260

skinparam activity {
    BackgroundColor #F0FDF4
    BorderColor #15803D
    FontColor #0F172A
    DiamondBackgroundColor #FEF3C7
    DiamondBorderColor #D97706
    DiamondFontColor #0F172A
}
skinparam ArrowColor #334155

|#FAFAFA|Khách hàng|
|#F8FAFC|Frontend (Next.js)|
|#F1F5F9|Backend (NestJS & DB)|

|Khách hàng|
start
:Xác nhận giỏ hàng & nhấn "Đặt hàng";

|Frontend (Next.js)|
:Bật trạng thái chờ (Loading Spinner);
:Gửi **POST /api/v1/orders** (Bearer JWT, items, promoCode);

|Backend (NestJS & DB)|
:JwtAuthGuard & ValidationPipe kiểm tra request;

if (Token & DTO hợp lệ?) then (Không hợp lệ)
    :Trả về lỗi 400 / 401;
    |Frontend (Next.js)|
    :Hiển thị cảnh báo lỗi tương ứng;
    |Khách hàng|
    stop
else (Hợp lệ)
    |Backend (NestJS & DB)|
    :Truy vấn kiểm tra tồn kho & giá sản phẩm, topping;
endif

if (Món khả dụng & đủ tồn kho?) then (Hết hàng / Lệch giá)
    :Trả về lỗi 400 Bad Request;
    |Frontend (Next.js)|
    :Cảnh báo sản phẩm đã hết hàng, yêu cầu cập nhật giỏ;
    |Khách hàng|
    stop
else (Đủ điều kiện)
    |Backend (NestJS & DB)|
    :Tính Authoritative Pricing & áp mã giảm giá;
    :Bắt đầu $transaction CSDL:;
    :Trừ kho bằng Optimistic Lock (version = version + 1);
endif

if (Có tranh chấp tồn kho đồng thời?) then (Tranh chấp / Thiếu hàng)
    :Rollback Transaction & trả về 400 Conflict;
    |Frontend (Next.js)|
    :Thông báo xảy ra tranh chấp đặt hàng, vui lòng thử lại;
    |Khách hàng|
    stop
else (Thành công)
    |Backend (NestJS & DB)|
    :Tạo bản ghi Order (PENDING, orderNumber);
    :Tạo OrderItem, OrderItemTopping, OrderStatusHistory;
    :Commit Transaction thành công;
    :Trả về HTTP 201 Created kèm OrderDetail;
endif

|Frontend (Next.js)|
:Tắt Loading;
:Lưu pendingOrderId vào Zustand (giữ nguyên giỏ hàng - D2);
:Điều hướng sang trang Thanh toán (/checkout/payment);

|Khách hàng|
stop

@enduml
"""

def render_kroki(text):
    svg_req = urllib.request.Request(
        'https://kroki.io/plantuml/svg',
        data=text.encode('utf-8'),
        headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain; charset=utf-8'}
    )
    with urllib.request.urlopen(svg_req, timeout=30) as resp:
        svg_content = resp.read().decode('utf-8')

    png_req = urllib.request.Request(
        'https://kroki.io/plantuml/png',
        data=text.encode('utf-8'),
        headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain; charset=utf-8'}
    )
    with urllib.request.urlopen(png_req, timeout=30) as resp:
        png_content = resp.read()

    return svg_content, png_content

def main():
    print(f"Applying compact swimlane redesign to {len(SWIMLANE_DIAGRAMS)} diagrams...")
    figures_dir = 'report/figures'
    os.makedirs(figures_dir, exist_ok=True)
    
    for i, (path, content) in enumerate(SWIMLANE_DIAGRAMS.items(), 1):
        print(f"[{i}/{len(SWIMLANE_DIAGRAMS)}] Overwriting & rendering {path}...")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
            
        base_name = os.path.splitext(os.path.basename(path))[0]
        puml_dir = os.path.dirname(path)
        
        doc_svg = os.path.join(puml_dir, f"{base_name}.svg")
        doc_png = os.path.join(puml_dir, f"{base_name}.png")
        fig_svg = os.path.join(figures_dir, f"{base_name}.svg")
        fig_png = os.path.join(figures_dir, f"{base_name}.png")
        
        try:
            svg_data, png_data = render_kroki(content)
            with open(doc_svg, 'w', encoding='utf-8') as f:
                f.write(svg_data)
            with open(fig_svg, 'w', encoding='utf-8') as f:
                f.write(svg_data)
                
            with open(doc_png, 'wb') as f:
                f.write(png_data)
            with open(fig_png, 'wb') as f:
                f.write(png_data)
                
            m = re.search(r'viewBox="([^"]+)"', svg_data)
            vb = m.group(1) if m else 'N/A'
            print(f"      -> SUCCESS: viewBox='{vb}'")
        except Exception as e:
            print(f"      -> ERROR: {e}")
            
        time.sleep(0.5)

    print("\nAll 5 swimlane diagrams re-rendered successfully!")

if __name__ == '__main__':
    main()
