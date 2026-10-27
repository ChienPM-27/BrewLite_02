import os
import sys
import time
import urllib.request
import re
import subprocess
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

DIAGRAMS = {}

# ==========================================
# 1. ACTIVITY DIAGRAMS (Vertical Flowcharts)
# ==========================================

DIAGRAMS['docs/cart/activity-cart.puml'] = """@startuml activity-cart
title Sơ Đồ Hoạt Động - Quản Lý Giỏ Hàng & Chuyển Đặt Hàng (Cart Flow)

skinparam nodesep 12
skinparam ranksep 16
skinparam defaultFontSize 11
skinparam activityFontSize 11
skinparam arrowFontSize 10
skinparam wrapWidth 220

skinparam backgroundColor white
skinparam activity {
    BackgroundColor white
    BorderColor black
    FontColor black
    DiamondBackgroundColor white
    DiamondBorderColor black
}
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ArrowColor black

start

:Khách hàng mở giao diện Giỏ hàng (/cart);
:Frontend đọc trạng thái giỏ hàng từ LocalStorage (Zustand);

if (Giỏ hàng trống?) then (Đúng)
    :Hiển thị màn hình thông báo giỏ hàng trống;
    :Vô hiệu hóa nút "Tiến hành thanh toán";
    stop
else (Có món)
    :Hiển thị danh sách món (Size, Topping, Số lượng);
    :Hiển thị tổng tiền tạm tính và số lượng badge;
endif

repeat
    :Khách hàng tương tác: Tăng/Giảm số lượng hoặc Xóa món;
    :Zustand store cập nhật trạng thái dòng món qua cartItemId;
    :Tính lại tổng tiền: (unitPrice + Σ toppings) * quantity;
    :Đồng bộ dữ liệu mới nhất vào LocalStorage;
repeat while (Khách hàng tiếp tục chỉnh sửa?) is (Có)

:Khách hàng nhấn nút "Tiến hành thanh toán";

if (Khách hàng đã đăng nhập?) then (Chưa)
    :Lưu đường dẫn chuyển tiếp (/cart);
    :Điều hướng sang trang /auth/login;
    :Khách hàng đăng nhập thành công;
    :Điều hướng quay lại trang /cart;
else (Đã đăng nhập)
endif

if (Đã có đơn PENDING và giỏ không đổi\\n(pendingCartSignature === currentSignature)?) then (Khớp)
    :Tái sử dụng pendingOrderId;
    :Chuyển thẳng sang trang /checkout/payment;
    stop
else (Chưa có hoặc Giỏ hàng đã đổi)
    if (Đã có đơn PENDING cũ trước đó?) then (Có)
        :Gửi request POST /api/v1/orders/:id/cancel để hủy đơn cũ;
        :Xóa pendingOrderId trong Zustand store;
    else (Không)
    endif
endif

:Chuyển hướng người dùng sang trang Xác nhận đặt hàng (/checkout);
stop
@enduml
"""

DIAGRAMS['docs/order/activity-order.puml'] = """@startuml activity-order
title Sơ Đồ Hoạt Động - Tạo Đơn Hàng & Khóa Tồn Kho (Order Creation Flow)

skinparam nodesep 12
skinparam ranksep 16
skinparam defaultFontSize 11
skinparam activityFontSize 11
skinparam arrowFontSize 10
skinparam wrapWidth 230

skinparam backgroundColor white
skinparam activity {
    BackgroundColor white
    BorderColor black
    FontColor black
    DiamondBackgroundColor white
    DiamondBorderColor black
}
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ArrowColor black

start

:Khách hàng xác nhận đơn hàng và nhấn "Đặt hàng";
:Frontend bật trạng thái chờ (loading) và gửi request\\n**POST /api/v1/orders** (Bearer JWT, items, promoCode);

:Backend JwtAuthGuard kiểm tra tính hợp lệ của Token;
if (Mã Token hợp lệ?) then (Hết hạn / Không hợp lệ)
    :Trả về lỗi 401 Unauthorized;
    :Frontend thông báo hết phiên, chuyển sang /auth/login;
    stop
else (Hợp lệ)
    :Trích xuất userId = req.user.sub;
endif

:ValidationPipe kiểm tra DTO đầu vào;
if (Dữ liệu DTO hợp lệ (số lượng 1..99, đúng format)?) then (Lỗi)
    :Trả về lỗi 400 Bad Request;
    :Frontend hiển thị thông báo dữ liệu không hợp lệ;
    stop
else (Hợp lệ)
endif

:Truy vấn kiểm tra Sản phẩm & Topping trong CSDL;
if (Món khả dụng (isAvailable = true) và đủ tồn kho?) then (Hết hàng / Không khả dụng)
    :Trả về lỗi 400 Bad Request\\n("Sản phẩm đã hết hàng hoặc không khả dụng");
    :Frontend cảnh báo và yêu cầu cập nhật lại giỏ hàng;
    stop
else (Đủ điều kiện)
endif

:Tính toán chi phí phía Server (Authoritative Pricing):\\nunitPrice = basePrice + sizePrice\\nlineTotal = (unitPrice + Σ toppingPrice) * quantity\\nfinalAmount = totalAmount - discountAmount (nếu có mã);

:Bắt đầu Database Transaction (Prisma $transaction);

:Trừ tồn kho Product bằng khóa lạc quan (Optimistic Lock):\\nWHERE id = productId AND version = curVersion AND stock >= qty\\nCập nhật stock = stock - qty, version = version + 1;

if (Có tranh chấp đồng thời (version đổi) hoặc tồn kho không đủ?) then (Tranh chấp / Thiếu hàng)
    :Rollback Transaction;
    :Trả về lỗi 400 Bad Request\\n("Xảy ra tranh chấp đồng thời khi trừ kho");
    :Frontend thông báo thử lại;
    stop
else (Trừ kho thành công)
endif

:Trừ tồn kho Toppings có điều kiện (stock >= qty);
:Tạo bản ghi Order (status = PENDING) và sinh orderNumber tự động;
:Tạo các bản ghi OrderItem, OrderItemTopping;
:Ghi log OrderStatusHistory (toStatus: PENDING);
:Commit Transaction thành công;

:Backend trả về HTTP 201 Created kèm dữ liệu OrderDetail;
:Frontend lưu pendingOrderId vào Zustand Store;
:Frontend giữ nguyên giỏ hàng (chỉ xóa khi thanh toán thành công - D2);
:Điều hướng người dùng sang trang Thanh toán (/checkout/payment);

stop
@enduml
"""

DIAGRAMS['docs/order-history/activity-order-history.puml'] = """@startuml activity-order-history
title Sơ Đồ Hoạt Động - Tra Cứu Lịch Sử Đơn Hàng (Order History Flow)

skinparam nodesep 12
skinparam ranksep 16
skinparam defaultFontSize 11
skinparam activityFontSize 11
skinparam arrowFontSize 10
skinparam wrapWidth 230

skinparam backgroundColor white
skinparam activity {
    BackgroundColor white
    BorderColor black
    FontColor black
    DiamondBackgroundColor white
    DiamondBorderColor black
}
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ArrowColor black

start

:Khách hàng truy cập trang Lịch sử đơn hàng (/orders);

if (Khách hàng đã đăng nhập?) then (Chưa)
    :Chuyển hướng sang /auth/login?next=/orders;
    stop
else (Đã đăng nhập)
    :Frontend hiển thị skeleton loading;
    :Gửi request **GET /api/v1/orders/me**\\n(Kèm Bearer Token, query page=1, limit=20, status?);
endif

:Backend JwtAuthGuard xác thực Token;
if (Mã Token hợp lệ?) then (Hết hạn / Không hợp lệ)
    :Trả về lỗi 401 Unauthorized;
    :Frontend xóa token, yêu cầu đăng nhập lại;
    stop
else (Hợp lệ)
    :Trích xuất userId = req.user.sub;
endif

:Backend truy vấn CSDL PostgreSQL (Prisma):\\nWHERE userId = req.user.sub (Đảm bảo cô lập dữ liệu)\\nORDER BY createdAt DESC;

:Backend tính toán phân trang và trả về HTTP 200 OK\\n{ items: [...], pagination: { page, limit, total, totalPages } };

if (Danh sách đơn hàng rỗng?) then (Rỗng)
    :Frontend hiển thị thông báo "Bạn chưa có đơn hàng nào";
    :Hiển thị nút liên kết "Khám phá thực đơn ngay";
    stop
else (Có đơn hàng)
    :Frontend hiển thị danh sách đơn dạng thẻ trực quan;
    :Hiển thị mã đơn #orderNumber, ngày giờ, số món, tổng tiền;
    :Hiển thị badge trạng thái màu (PENDING, PAID, CANCELLED...);
endif

if (Khách hàng chọn thao tác?) then (Nhấn "Thanh toán ngay" đơn PENDING)
    :Điều hướng trực tiếp sang /checkout/payment?orderId=...;
    stop
else (Nhấn "Xem chi tiết" đơn hàng)
    :Frontend gọi GET /api/v1/orders/:id;
    :Backend trả về chi tiết món, size, topping và thanh toán;
    :Frontend hiển thị Modal chi tiết hóa đơn đơn hàng;
endif

stop
@enduml
"""

DIAGRAMS['docs/product-catalog/activity-product-catalog.puml'] = """@startuml activity-product-catalog
title Sơ Đồ Hoạt Động - Duyệt Thực Đơn & Tìm Kiếm Đồ Uống (Catalog Flow)

skinparam nodesep 12
skinparam ranksep 16
skinparam defaultFontSize 11
skinparam activityFontSize 11
skinparam arrowFontSize 10
skinparam wrapWidth 230

skinparam backgroundColor white
skinparam activity {
    BackgroundColor white
    BorderColor black
    FontColor black
    DiamondBackgroundColor white
    DiamondBorderColor black
}
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ArrowColor black

start

:Khách hàng truy cập trang Thực đơn (/menu);
:Frontend hiển thị hiệu ứng tải (Loading Skeleton);
:Frontend gửi request **GET /api/v1/products**;

:Backend ProductsService truy vấn CSDL PostgreSQL (Prisma):\\nWHERE isAvailable = true\\nINCLUDE category, sizePrices\\nORDER BY category.displayOrder, name ASC;

if (Truy vấn CSDL thành công?) then (Thất bại)
    :Backend trả về mã lỗi 500 Internal Server Error;
    :Frontend hiển thị thông báo gián đoạn kết nối và nút thử lại;
    stop
else (Thành công)
    :Backend đóng gói dữ liệu qua TransformInterceptor;
    :Trả về HTTP 200 OK với danh sách món đang kinh doanh;
endif

:Frontend phân tích danh sách và tạo các Tab Danh mục:\\nTab "Tất cả", "Cà phê", "Trà & Trái cây"... kèm bộ đếm số lượng;

if (Danh sách sản phẩm trống?) then (Rỗng)
    :Frontend hiển thị thông báo "Quán chưa mở bán món nào";
    stop
else (Có sản phẩm)
    :Frontend hiển thị danh sách thẻ đồ uống (hình ảnh, tên, giá gốc ly S);
endif

repeat
    if (Khách hàng tương tác tìm kiếm / lọc?) then (Lọc theo danh mục)
        :Chọn Tab danh mục (ví dụ: "Cà phê");
        :Frontend lọc tức thì các món có categoryName tương ứng;
    else (Tìm kiếm từ khóa)
        :Nhập từ khóa vào ô tìm kiếm (hỗ trợ tiếng Việt không dấu);
        :Frontend lọc thời gian thực theo tên đồ uống;
    endif
    :Frontend cập nhật danh sách hiển thị trên lưới sản phẩm;
repeat while (Khách hàng tiếp tục tìm kiếm?) is (Tiếp tục)

:Khách hàng nhấp vào thẻ đồ uống ưng ý;
:Điều hướng sang trang Chi tiết món (/products/[id]);

stop
@enduml
"""

DIAGRAMS['docs/product-detail/activity-product-detail.puml'] = """@startuml activity-product-detail
title Sơ Đồ Hoạt Động - Tùy Biến Đồ Uống & Thêm Vào Giỏ (Product Detail Flow)

skinparam nodesep 12
skinparam ranksep 16
skinparam defaultFontSize 11
skinparam activityFontSize 11
skinparam arrowFontSize 10
skinparam wrapWidth 230

skinparam backgroundColor white
skinparam activity {
    BackgroundColor white
    BorderColor black
    FontColor black
    DiamondBackgroundColor white
    DiamondBorderColor black
}
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ArrowColor black

start

:Khách hàng mở trang Chi tiết món (/products/[id]);
:Frontend hiển thị hiệu ứng skeleton và gửi request\\n**GET /api/v1/products/:id**;

:Backend ProductDetailService truy vấn CSDL PostgreSQL:\\nTruy vấn Product, bảng phụ ProductSizePrice\\nvà danh sách Topping đang khả dụng (isAvailable = true);

if (Sản phẩm có tồn tại trong CSDL?) then (Không tìm thấy)
    :Backend trả về mã lỗi 404 Not Found;
    :Frontend hiển thị thông báo "Sản phẩm không tồn tại";
    stop
else (Tìm thấy)
    :Backend trả về HTTP 200 OK kèm thông tin món\\n(basePrice, sizePrices [S/M/L], toppings khả dụng);
endif

if (Sản phẩm đang mở bán (isAvailable = true)?) then (Tạm ngưng / Hết hàng)
    :Frontend hiển thị nhãn "Tạm ngưng phục vụ";
    :Vô hiệu hóa các nút chọn và thêm vào giỏ;
    stop
else (Đang kinh doanh)
    :Frontend hiển thị hình ảnh, mô tả và giá gốc ly S;
    :Mặc định chọn Size S, số lượng ban đầu là 1;
endif

repeat
    if (Khách hàng thực hiện tùy chỉnh?) then (Chọn kích cỡ Size)
        :Chọn Size S (+0đ), Size M (+5.000đ) hoặc Size L (+10.000đ);
    else if (Chọn Topping thêm) then (Topping)
        :Đánh dấu chọn/bỏ chọn Topping (tối đa 3 loại);
    else (Chỉnh số lượng)
        :Nhấn nút [+] hoặc [-] trên bộ đếm số lượng (1..99);
    endif
    :Frontend tự động tính lại tổng tiền tạm tính thời gian thực:\\nđơn giá = basePrice + sizePrice + Σ toppingPrice\\ntổng tiền = đơn giá * số lượng;
repeat while (Khách hàng tiếp tục chỉnh sửa?) is (Tiếp tục)

:Khách hàng nhấn nút "Thêm vào giỏ hàng - [Tổng tiền]đ";

:Frontend sinh khóa định danh duy nhất (cartItemId):\\n`${productId}-${size}-${sortedToppingIds.join('-')}`;

if (Dòng sản phẩm cùng cấu hình đã có trong giỏ?) then (Đã có)
    :Tăng số lượng của dòng đó lên (tối đa 99 ly);
else (Chưa có)
    :Tạo một dòng món mới (CartItem) thêm vào danh sách;
endif

:Zustand cập nhật tổng tiền giỏ hàng và số lượng badge;
:Đồng bộ trạng thái mới vào LocalStorage trình duyệt;
:Hiển thị thông báo Toast "Đã thêm vào giỏ hàng thành công";

stop
@enduml
"""

# ==========================================
# 2. USE CASE DIAGRAMS (Compact Grid Stack)
# ==========================================

DIAGRAMS['docs/cart/usecase-cart.puml'] = """@startuml usecase-cart
title Sơ Đồ Use Case - Phân Hệ Giỏ Hàng (Cart Module)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Client

rectangle "Phân Hệ Giỏ Hàng (BrewLite Cart)" {
    usecase "Xem giỏ hàng" as UC_View
    usecase "Cập nhật số lượng / Xóa món" as UC_Edit
    usecase "Tự động tính tổng tiền & badge" as UC_Calc
    usecase "Tiến hành đặt hàng (Checkout)" as UC_Checkout
    usecase "Xác thực đăng nhập (JWT)" as UC_Auth
    usecase "Kiểm tra tồn kho & đơn giá" as UC_Validate
}

Client --> UC_View
Client --> UC_Edit
Client --> UC_Checkout

UC_Edit ..> UC_Calc : <<include>>
UC_View ..> UC_Calc : <<include>>
UC_Checkout ..> UC_Auth : <<include>>
UC_Checkout ..> UC_Validate : <<include>>

UC_View -[hidden]down-> UC_Edit
UC_Edit -[hidden]down-> UC_Checkout
UC_Calc -[hidden]down-> UC_Auth
UC_Auth -[hidden]down-> UC_Validate
@enduml
"""

DIAGRAMS['docs/auth/usecase-auth.puml'] = """@startuml usecase-auth
title Sơ Đồ Use Case - Phân Hệ Xác Thực & Tài Khoản (Auth Module)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer
actor "Hệ thống" as System

rectangle "Phân Hệ Xác Thực & Tài Khoản" {
    usecase "UC-AUTH-01: Đăng ký tài khoản" as UC_Register
    usecase "UC-AUTH-02: Đăng nhập hệ thống" as UC_Login
    usecase "UC-AUTH-03: Xác thực JWT & Guard" as UC_VerifyToken
    usecase "Băm mật khẩu (bcrypt hash)" as UC_HashPassword
    usecase "Phát hành Access Token (JWT)" as UC_IssueJWT
    usecase "Lưu thông tin User vào DB" as UC_SaveUser
}

Customer --> UC_Register
Customer --> UC_Login
Customer --> UC_VerifyToken

System --> UC_VerifyToken

UC_Register ..> UC_HashPassword : <<include>>
UC_Register ..> UC_SaveUser : <<include>>
UC_Login ..> UC_IssueJWT : <<include>>
UC_VerifyToken ..> UC_IssueJWT : <<extend>>

UC_Register -[hidden]down-> UC_Login
UC_Login -[hidden]down-> UC_VerifyToken
UC_HashPassword -[hidden]down-> UC_SaveUser
UC_SaveUser -[hidden]down-> UC_IssueJWT
@enduml
"""

DIAGRAMS['docs/order-history/usecase-order-history.puml'] = """@startuml usecase-order-history
title Sơ Đồ Use Case - Phân Hệ Lịch Sử Đơn Hàng (Order History)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer

rectangle "Phân Hệ Lịch Sử Đơn Hàng" {
    usecase "Xem lịch sử đơn hàng\\n(UC-ORDER-HISTORY)" as UC_History
    usecase "Xác thực phiên đăng nhập (JWT)" as UC_Auth
    usecase "Xem chi tiết đơn hàng" as UC_Detail
    usecase "Lọc theo trạng thái đơn" as UC_Filter
    usecase "Tải thêm & phân trang" as UC_Paging
    usecase "Đăng nhập lại khi hết hạn" as UC_Login
}

Customer --> UC_History
Customer --> UC_Detail

UC_History ..> UC_Auth : <<include>>
UC_Detail ..> UC_Auth : <<include>>
UC_History ..> UC_Filter : <<extend>>
UC_History ..> UC_Paging : <<extend>>
UC_Auth ..> UC_Login : <<extend>>

UC_History -[hidden]down-> UC_Detail
UC_Auth -[hidden]down-> UC_Filter
UC_Filter -[hidden]down-> UC_Paging
@enduml
"""

DIAGRAMS['docs/order/usecase-order.puml'] = """@startuml usecase-order
title Sơ Đồ Use Case - Phân Hệ Đặt Hàng (Order Creation)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer
actor "Hệ thống Backend" as Backend

rectangle "Phân Hệ Đặt Hàng (Order Management)" {
    usecase "Tạo đơn hàng\\n(UC-ORDER-CREATE)" as UC_CreateOrder
    usecase "Xác thực phiên (JWT Guard)" as UC_Auth
    usecase "Kiểm tra giá & khuyến mãi" as UC_ValidatePricing
    usecase "Khóa tồn kho (Optimistic Lock)" as UC_Stock
    usecase "Chuyển trạng thái đơn (State Machine)" as UC_StateMachine
}

Customer --> UC_CreateOrder

UC_CreateOrder ..> UC_Auth : <<include>>
UC_CreateOrder ..> UC_ValidatePricing : <<include>>
UC_CreateOrder ..> UC_Stock : <<include>>
UC_CreateOrder ..> UC_StateMachine : <<include>>

Backend --> UC_ValidatePricing
Backend --> UC_Stock
Backend --> UC_StateMachine

UC_CreateOrder -[hidden]down-> UC_Auth
UC_ValidatePricing -[hidden]down-> UC_Stock
UC_Stock -[hidden]down-> UC_StateMachine
@enduml
"""

DIAGRAMS['docs/payment/usecase-payment.puml'] = """@startuml usecase-payment
title Sơ Đồ Use Case - Phân Hệ Thanh Toán (Payment System)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 12
skinparam ranksep 14

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer

rectangle "Phân Hệ Thanh Toán" {
    usecase "Chọn phương thức (Ví / Thẻ)" as UC1
    usecase "Thực hiện thanh toán" as UC2
    usecase "Thanh toán Ví Momo / VNPay" as UC3
    usecase "Thanh toán Thẻ Quốc tế / ATM" as UC4
    usecase "Kiểm tra Idempotency-Key" as UC7
    usecase "Xử lý kết quả giao dịch" as UC8
    usecase "Xem trạng thái hóa đơn" as UC5
}

actor "Cổng thanh toán\\n(Mock Gateway)" as Gateway

Customer --> UC1
Customer --> UC2
Customer --> UC5

UC2 ..> UC1 : <<include>>
UC2 ..> UC7 : <<include>>
UC2 ..> UC8 : <<include>>

UC3 ..> UC2 : <<extend>>
UC4 ..> UC2 : <<extend>>

Gateway --> UC8

UC1 -[hidden]down-> UC2
UC2 -[hidden]down-> UC5
UC3 -[hidden]down-> UC4
UC7 -[hidden]down-> UC8
UC4 -[hidden]down-> UC7
@enduml
"""

DIAGRAMS['docs/product-catalog/usecase-product-catalog.puml'] = """@startuml usecase-product-catalog
title Sơ Đồ Use Case - Phân Hệ Danh Mục Sản Phẩm (Product Catalog)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer
actor "Hệ thống BrewLite" as System

rectangle "Phân Hệ Danh Mục Sản Phẩm (Catalog)" {
    usecase "Xem thực đơn đồ uống\\n(UC-CAT-01)" as UC_ViewMenu
    usecase "Tìm kiếm sản phẩm\\n(UC-CAT-02)" as UC_Search
    usecase "Lọc theo danh mục\\n(UC-CAT-03)" as UC_Filter
    usecase "Truy vấn CSDL sản phẩm" as UC_GetProducts
    usecase "Hiển thị danh sách thẻ món" as UC_Display
}

Customer --> UC_ViewMenu
Customer --> UC_Search
Customer --> UC_Filter

System --> UC_GetProducts

UC_ViewMenu ..> UC_GetProducts : <<include>>
UC_ViewMenu ..> UC_Display : <<include>>
UC_Search ..> UC_Display : <<include>>
UC_Filter ..> UC_Display : <<include>>

UC_ViewMenu -[hidden]down-> UC_Search
UC_Search -[hidden]down-> UC_Filter
UC_GetProducts -[hidden]down-> UC_Display
@enduml
"""

DIAGRAMS['docs/product-detail/usecase-product-detail.puml'] = """@startuml usecase-product-detail
title Sơ Đồ Use Case - Phân Hệ Chi Tiết Món (Product Detail)

skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam defaultFontSize 11
skinparam nodesep 14
skinparam ranksep 16

skinparam actor {
    BackgroundColor white
    BorderColor black
}
skinparam usecase {
    BackgroundColor white
    BorderColor black
}

actor "Khách hàng" as Customer
actor "Mô-đun Giỏ hàng" as Cart

rectangle "Phân Hệ Chi Tiết Đồ Uống (Product Detail)" {
    usecase "Xem thông tin chi tiết món\\n(UC-PROD-01)" as UC01
    usecase "Tùy biến món (Size & Topping)\\n(UC-PROD-02)" as UC02
    usecase "Chọn kích cỡ (Size S/M/L)" as UC02A
    usecase "Chọn loại Topping thêm" as UC02B
    usecase "Tính tạm tính & kiểm tra bán\\n(UC-PROD-03)" as UC03
    usecase "Thêm vào giỏ hàng\\n(UC-PROD-04)" as UC04
}

Customer --> UC01
Customer --> UC02
Customer --> UC04

UC02 ..> UC02A : <<include>>
UC02 ..> UC02B : <<include>>
UC02 ..> UC03 : <<include>>
UC04 ..> UC03 : <<include>>
UC04 --> Cart : Gửi dữ liệu món

UC01 -[hidden]down-> UC02
UC02 -[hidden]down-> UC04
UC02A -[hidden]down-> UC02B
UC02B -[hidden]down-> UC03
@enduml
"""

# ==========================================
# 3. SEQUENCE DIAGRAMS (Streamlined Columns)
# ==========================================

DIAGRAMS['docs/auth/sequence-auth.puml'] = """@startuml sequence-auth
title Sơ Đồ Tuần Tự - Xác Thực Người Dùng (Register, Login & Guard)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 4
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js)" #F9F9F9
    participant "AuthPage" as Page
    participant "useAuthStore" as Store
    participant "auth.service" as ClientService
end box

box "Backend (NestJS)" #F0F7FF
    participant "JwtAuthGuard" as Guard
    participant "AuthController" as Controller
    participant "AuthService" as Service
    participant "Prisma DB" as DB
end box

== Luồng 1: Đăng Ký Tài Khoản (Register) ==
User -> Page: Nhập email, password, fullName & nhấn "Đăng ký"
activate Page
Page -> ClientService: registerApi({ email, password, fullName })
activate ClientService
ClientService -> Controller: POST /api/v1/auth/register
activate Controller
Controller -> Service: register(dto)
activate Service

Service -> DB: prisma.user.findUnique({ where: { email } })
activate DB
DB --> Service: Kết quả tìm kiếm
deactivate DB

alt Email đã tồn tại
    Service --> Controller: ConflictException(409)
    Controller --> ClientService: 409 Conflict: "Email đã được sử dụng"
    ClientService --> Page: Ném ApiError(409)
    Page --> User: Hiển thị banner lỗi trùng email
else Email hợp lệ
    Service -> Service: bcrypt.hash(password, 10)
    Service -> DB: prisma.user.create({ email, passwordHash, fullName })
    activate DB
    DB --> Service: user record
    deactivate DB

    Service -> Service: jwtService.sign({ sub: user.id, email })
    Service --> Controller: { user, accessToken }
    deactivate Service
    Controller --> ClientService: 201 Created: { user, accessToken }
    deactivate Controller
    ClientService --> Page: authResponse
    deactivate ClientService

    Page -> Store: setAuth(user, accessToken)
    Page --> User: Chuyển hướng sang trang mua hàng
end

== Luồng 2: Đăng Nhập Hệ Thống (Login) ==
User -> Page: Nhập email, password & nhấn "Đăng nhập"
Page -> ClientService: loginApi({ email, password })
activate ClientService
ClientService -> Controller: POST /api/v1/auth/login
activate Controller
Controller -> Service: login(dto)
activate Service

Service -> DB: prisma.user.findUnique({ where: { email } })
activate DB
DB --> Service: user record
deactivate DB

alt Người dùng không tồn tại hoặc sai mật khẩu
    Service -> Service: bcrypt.compare() -> false
    Service --> Controller: UnauthorizedException(401)
    Controller --> ClientService: 401 Unauthorized
    ClientService --> Page: Ném ApiError(401)
    Page --> User: Hiển thị "Email hoặc mật khẩu không đúng"
else Mật khẩu chính xác
    Service -> Service: bcrypt.compare() -> true
    Service -> Service: jwtService.sign({ sub: user.id, email })
    Service --> Controller: { user, accessToken }
    deactivate Service
    Controller --> ClientService: 200 OK: { user, accessToken }
    deactivate Controller
    ClientService --> Page: authResponse
    deactivate ClientService
    Page -> Store: setAuth(user, accessToken)
    Page --> User: Đăng nhập thành công, chuyển tiếp về trang trước
end

== Luồng 3: Bảo Vệ Endpoint Bằng JwtAuthGuard ==
User -> Page: Thực hiện thao tác yêu cầu đăng nhập (Đặt hàng, Xem lịch sử)
Page -> ClientService: Gửi API có Bearer Token
activate ClientService
ClientService -> Guard: Request kèm Header "Authorization: Bearer <token>"
activate Guard

Guard -> Guard: jwtService.verify(token)
alt Token hết hạn hoặc không hợp lệ
    Guard --> ClientService: 401 Unauthorized
    ClientService --> Page: 401 Error
    Page -> Store: logout()
    Page --> User: Hết phiên đăng nhập, chuyển sang /auth/login
else Token hợp lệ
    Guard -> Controller: Cho phép đi tiếp (gắn req.user = { sub: userId })
    deactivate Guard
    activate Controller
    Controller --> ClientService: Xử lý nghiệp vụ & trả về kết quả
    deactivate Controller
    ClientService --> Page: Dữ liệu thành công
    deactivate ClientService
end
deactivate Page

@enduml
"""

DIAGRAMS['docs/cart/sequence-cart.puml'] = """@startuml sequence-cart
title Sơ Đồ Tuần Tự - Quản Lý Giỏ Hàng (Cart Management)
autonumber
skinparam maxMessageSize 100
skinparam ParticipantPadding 4
skinparam BoxPadding 4
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js & Zustand)" #F9F9F9
    participant "CartPage" as Page
    participant "EditModal" as Modal
    participant "useCartStore" as CartStore
    participant "LocalStorage" as LocalStorage
    participant "AppRouter" as Router
end box

== Giai đoạn 1: Khởi tạo & Tải giỏ hàng ==
User -> Page: Truy cập trang giỏ hàng (/cart)
activate Page
Page -> CartStore: Đọc trạng thái giỏ hàng (items, totalAmount, badgeCount)
activate CartStore
CartStore -> LocalStorage: getItem('brewlite_cart')
activate LocalStorage
LocalStorage --> CartStore: Dữ liệu JSON giỏ hàng đã lưu
deactivate LocalStorage
CartStore --> Page: State: { items, totalAmount, badgeCount }
deactivate CartStore

alt Giỏ hàng trống (items.length === 0)
    Page --> User: Hiển thị giao diện giỏ rỗng, link "Khám phá menu"
else Giỏ hàng có sản phẩm
    Page --> User: Hiển thị danh sách món, số lượng, size, topping và tổng tiền
end

== Giai đoạn 2: Thao tác chỉnh sửa giỏ hàng ==
alt Cập nhật số lượng (Tăng / Giảm số lượng)
    User -> Page: Nhấn +/- trên QuantityStepper
    Page -> CartStore: updateQuantity(cartItemId, newQty)
    activate CartStore
    alt newQty <= 0
        CartStore -> CartStore: Tự động xóa dòng sản phẩm (removeItem)
    else newQty > 99
        CartStore -> CartStore: Giới hạn tối đa MAX_QUANTITY (99)
    else 1 <= newQty <= 99
        CartStore -> CartStore: Cập nhật quantity cho dòng sản phẩm
    end
    CartStore -> CartStore: Tính lại totalAmount & badgeCount
    CartStore -> LocalStorage: setItem('brewlite_cart', updatedState)
    CartStore --> Page: State đã cập nhật
    deactivate CartStore
    Page --> User: Cập nhật ngay số lượng và tổng tiền trên giao diện

else Xóa món khỏi giỏ hàng
    User -> Page: Nhấn biểu tượng thùng rác (Xóa món)
    Page -> CartStore: removeItem(cartItemId)
    activate CartStore
    CartStore -> CartStore: Lọc bỏ item tương ứng, tính lại tổng tiền
    CartStore -> LocalStorage: setItem('brewlite_cart', updatedState)
    CartStore --> Page: State đã cập nhật
    deactivate CartStore
    Page --> User: Hiển thị Toast "Đã xóa sản phẩm khỏi giỏ"

else Tùy chỉnh lại Size & Topping
    User -> Page: Nhấn nút "Tùy chỉnh" trên dòng món
    Page -> Modal: Mở EditCartItemModal(item)
    activate Modal
    User -> Modal: Đổi size / chọn lại toppings và nhấn "Lưu thay đổi"
    Modal -> CartStore: updateItem(cartItemId, { size, toppingIds, unitPrice, quantity })
    activate CartStore
    CartStore -> CartStore: Sinh id dòng mới: `${productId}-${size}-${toppingIds.sort().join('-')}`
    alt Dòng mới trùng với dòng đã có sẵn trong giỏ
        CartStore -> CartStore: Gộp số lượng (merge quantity) và xóa dòng cũ
    else Không trùng lặp
        CartStore -> CartStore: Cập nhật thông tin dòng tại chỗ
    end
    CartStore -> CartStore: Tính lại totalAmount & badgeCount
    CartStore -> LocalStorage: setItem('brewlite_cart', updatedState)
    CartStore --> Modal: Cập nhật thành công
    deactivate CartStore
    Modal --> Page: Đóng Modal
    deactivate Modal
    Page --> User: Hiển thị thông báo giỏ hàng đã cập nhật
end

== Giai đoạn 3: Chuyển sang thanh toán (Checkout) ==
User -> Page: Nhập mã khuyến mãi (tùy chọn) & nhấn "Tiến hành đặt hàng"
Page -> Page: handleCheckout()
alt Giỏ hàng không có sản phẩm
    Page -> Page: Ngăn chặn chuyển trang (return)
else Giỏ hàng có sản phẩm
    Page -> Router: router.push('/checkout')
    activate Router
    Router --> User: Điều hướng sang trang Xác nhận đơn hàng (/checkout)
    deactivate Router
end
deactivate Page

@enduml
"""

DIAGRAMS['docs/order/sequence-order.puml'] = """@startuml sequence-order
title Sơ Đồ Tuần Tự - Tạo Đơn Hàng & Khóa Tồn Kho Lạc Quan (Order Creation)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 4
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js)" #F9F9F9
    participant "CheckoutPage" as Page
    participant "useCartStore" as CartStore
    participant "order.service" as ClientService
end box

box "Backend (NestJS)" #F0F7FF
    participant "JwtAuthGuard" as Guard
    participant "OrdersController" as Controller
    participant "OrdersService" as Service
    participant "Prisma DB" as DB
end box

User -> Page: Truy cập /checkout & nhấn "Tiếp tục thanh toán"
activate Page

opt Tái sử dụng đơn PENDING (giỏ không đổi: signature khớp)
    Page --> User: Chuyển thẳng sang /checkout/payment?orderId=pendingOrderId
end

opt Giỏ đã đổi nhưng còn pendingOrderId cũ
    Page -> ClientService: cancelOrder(pendingOrderId)
    ClientService -> Controller: POST /api/v1/orders/:id/cancel
    Controller --> ClientService: 200 OK: Đã hủy đơn cũ
end

Page -> ClientService: createOrder({ items, promotionCode })
activate ClientService

ClientService -> Guard: POST /api/v1/orders (Bearer JWT)
activate Guard

alt Token không hợp lệ
    Guard --> ClientService: 401 Unauthorized
    ClientService --> Page: 401 Error
    Page --> User: Điều hướng về /auth/login
else Token hợp lệ
    Guard -> Controller: Chuyển tiếp Request (userId = req.user.sub)
    deactivate Guard
    activate Controller

    Controller -> Service: create(userId, dto)
    activate Service

    Service -> DB: Kiểm tra tồn kho & lấy bảng giá hiện hành
    activate DB
    DB --> Service: Thông tin sản phẩm, topping
    deactivate DB

    Service -> Service: Tính toán chi phí authoritative pricing & áp dụng mã giảm giá (nếu có)

    Service -> DB: Bắt đầu $transaction: Khóa lạc quan (Optimistic Locking):\\nUPDATE "Product" SET stock = stock - qty, version = version + 1\\nWHERE id = :id AND version = :v AND stock >= qty
    activate DB

    alt Có tranh chấp đồng thời hoặc hết hàng
        DB --> Service: RecordNotFound (0 rows updated)
        Service -> DB: Rollback Transaction
        Service --> Controller: Conflict / BadRequest (400)
        Controller --> ClientService: 400 Bad Request
        ClientService --> Page: Ném lỗi tồn kho
        Page --> User: Cảnh báo "Sản phẩm đã hết hàng hoặc có tranh chấp"
    else Khóa tồn kho thành công
        DB --> Service: Update OK
        Service -> DB: Tạo Order (PENDING), OrderItem, OrderItemTopping, OrderStatusHistory
        Service -> DB: Commit Transaction
        DB --> Service: Order Entity đã tạo
        deactivate DB

        Service --> Controller: OrderResponseDto
        deactivate Service
        Controller --> ClientService: 201 Created: { success: true, data: order }
        deactivate Controller
        ClientService --> Page: Dữ liệu đơn hàng mới
        deactivate ClientService

        Page -> CartStore: setPendingOrderId(order.id, currentCartSignature)
        Page --> User: Điều hướng sang trang thanh toán (/checkout/payment)
    end
end
deactivate Page

@enduml
"""

DIAGRAMS['docs/order-history/sequence-order-history.puml'] = """@startuml sequence-order-history
title Sơ Đồ Tuần Tự - Tra Cứu Lịch Sử Đơn Hàng & Chi Tiết (Order History)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 4
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js)" #F9F9F9
    participant "HistoryUI" as UI
    participant "order.service" as ClientService
end box

box "Backend (NestJS)" #F0F7FF
    participant "JwtAuthGuard" as Guard
    participant "OrdersController" as Controller
    participant "OrdersService" as Service
    participant "Prisma DB" as DB
end box

== Luồng 1: Xem danh sách lịch sử đơn hàng (/orders) ==
User -> UI: Truy cập trang Lịch sử đơn hàng
activate UI
UI -> ClientService: getOrderHistory({ page: 1, limit: 20 })
activate ClientService

ClientService -> Guard: GET /api/v1/orders/me (Bearer JWT)
activate Guard

alt Token không hợp lệ
    Guard --> ClientService: 401 Unauthorized
    ClientService --> UI: Ném lỗi 401
    UI --> User: Chuyển hướng sang /auth/login
else Token hợp lệ
    Guard -> Controller: Chuyển tiếp Request (userId = req.user.sub)
    deactivate Guard
    activate Controller

    Controller -> Service: getOrderHistory(userId, query)
    activate Service

    Service -> DB: prisma.order.findMany({\\n  where: { userId },\\n  orderBy: { createdAt: 'desc' }, skip, take\\n})
    activate DB
    DB --> Service: [ordersList, totalCount]
    deactivate DB

    Service -> Service: Map dữ liệu: tính itemCount = sum(quantity),\\nđịnh dạng ngày giờ, tính phân trang
    Service --> Controller: PaginatedOrderResponseDto
    deactivate Service
    Controller --> ClientService: 200 OK: { data: orders, pagination: {...} }
    deactivate Controller
    ClientService --> UI: Danh sách đơn hàng
    deactivate ClientService
    UI --> User: Hiển thị thẻ đơn hàng (mã đơn, ngày giờ, số món, trạng thái)
end

== Luồng 2: Xem chi tiết hóa đơn đơn hàng ==
User -> UI: Nhấp "Xem chi tiết" một đơn hàng
UI -> ClientService: getOrderDetail(orderId)
activate ClientService
ClientService -> Guard: GET /api/v1/orders/:id (Bearer JWT)
activate Guard
Guard -> Controller: Chuyển tiếp Request
deactivate Guard
activate Controller
Controller -> Service: findOne(orderId, userId)
activate Service
Service -> DB: prisma.order.findFirst({\\n  where: { id: orderId, userId },\\n  include: { items: { include: { toppings: true } }, payments: true }\\n})
activate DB
DB --> Service: Chi tiết Order Entity
deactivate DB
Service --> Controller: OrderDetailResponseDto
deactivate Service
Controller --> ClientService: 200 OK: Dữ liệu chi tiết hóa đơn
deactivate Controller
ClientService --> UI: Dữ liệu chi tiết
deactivate ClientService
UI --> User: Mở Modal hiển thị hóa đơn (danh sách món, size, topping, thanh toán)

== Luồng 3: Hủy đơn hàng PENDING ==
opt Khách hàng muốn hủy đơn PENDING
    User -> UI: Nhấn "Hủy đơn" trên thẻ đơn hàng
    UI -> ClientService: cancelOrder(orderId)
    activate ClientService
    ClientService -> Guard: POST /api/v1/orders/:id/cancel
    activate Guard
    Guard -> Controller: Chuyển tiếp Request
    deactivate Guard
    activate Controller
    Controller -> Service: cancel(orderId, userId)
    activate Service
    Service -> DB: Bắt đầu $transaction: Đổi trạng thái sang CANCELLED,\\nhoàn trả tồn kho (Optimistic Lock)
    activate DB
    DB --> Service: Transaction thành công
    deactivate DB
    Service --> Controller: OrderResponseDto
    deactivate Service
    Controller --> ClientService: 200 OK
    deactivate Controller
    ClientService --> UI: Thông báo hủy thành công
    deactivate ClientService
    UI --> User: Cập nhật badge sang CANCELLED, hiển thị Toast thông báo
end
deactivate UI

@enduml
"""

DIAGRAMS['docs/payment/sequence-payment.puml'] = """@startuml sequence-payment
title Sơ Đồ Tuần Tự - Thanh Toán & Cơ Chế Idempotency (Payment Processing)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 4
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js & Zustand)" #F9F9F9
    participant "PaymentPage" as Page
    participant "useCartStore" as CartStore
    participant "payment.service" as ClientService
end box

box "Backend (NestJS)" #F0F7FF
    participant "JwtAuthGuard" as Guard
    participant "PaymentsController" as Controller
    participant "PaymentsService" as Service
    participant "MockGateway" as Gateway
    participant "Prisma DB" as DB
end box

User -> Page: Chọn phương thức (Ví/Thẻ) & nhấn "Thanh toán"
activate Page
Page -> Page: Sinh idempotencyKey (UUIDv4)
Page -> ClientService: createPayment({ orderId, method }, idempotencyKey)
activate ClientService

ClientService -> Guard: POST /api/v1/payments (Headers: Idempotency-Key, Bearer Token)
activate Guard

alt Token không hợp lệ
    Guard --> ClientService: 401 Unauthorized
    ClientService --> Page: Ném lỗi 401
    Page --> User: Yêu cầu đăng nhập lại
else Token hợp lệ
    Guard -> Controller: Chuyển tiếp Request (userId = req.user.sub)
    deactivate Guard
    activate Controller

    Controller -> Service: createPayment(userId, idempotencyKey, dto)
    activate Service

    Service -> DB: prisma.payment.findUnique({ where: { idempotencyKey } })
    activate DB
    DB --> Service: Kết quả tìm kiếm
    deactivate DB

    alt Đã tồn tại giao dịch thành công với Idempotency-Key này (Request lặp)
        Service --> Controller: Trả về kết quả giao dịch cũ đã lưu (Cached Response)
        Controller --> ClientService: 200 OK: PaymentResponseDto
        ClientService --> Page: Dữ liệu thanh toán thành công
        Page -> CartStore: clearCart(), clearPendingOrderId()
        Page --> User: Hiển thị hóa đơn thanh toán thành công
    else Giao dịch mới (Idempotency hợp lệ)
        Service -> DB: Kiểm tra Order: status === PENDING & userId hợp lệ
        activate DB
        DB --> Service: Thông tin đơn hàng & số tiền
        deactivate DB

        Service -> Gateway: processPayment(orderId, amount, method)
        activate Gateway
        Gateway --> Service: { success: true, transactionId, code: "00" }
        deactivate Gateway

        Service -> DB: Bắt đầu $transaction: Cập nhật Payment SUCCESS, đổi Order sang PAID, cộng điểm Loyalty
        activate DB
        DB --> Service: Commit Transaction thành công
        deactivate DB

        Service --> Controller: PaymentResponseDto
        deactivate Service
        Controller --> ClientService: 201 Created: { success: true, data: payment }
        deactivate Controller
        ClientService --> Page: Kết quả thanh toán
        deactivate ClientService

        Page -> CartStore: clearCart(), clearPendingOrderId()
        Page --> User: Chuyển sang màn hình xác nhận thanh toán & chi tiết hóa đơn
    end
end
deactivate Page

@enduml
"""

DIAGRAMS['docs/product-catalog/sequence-product-catalog.puml'] = """@startuml sequence-product-catalog
title Sơ Đồ Tuần Tự - Hiển Thị Thực Đơn Sản Phẩm (Product Catalog)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 6
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js)" #F9F9F9
    participant "MenuPage & Hook" as UI
    participant "product.service" as ClientService
end box

box "Backend (NestJS)" #F0F7FF
    participant "ProductsController" as Controller
    participant "ProductsService" as Service
    participant "Prisma DB" as DB
end box

User -> UI: Truy cập trang thực đơn (/menu)
activate UI
UI -> ClientService: getProductCatalog()
activate ClientService

ClientService -> Controller: GET /api/v1/products
activate Controller
Controller -> Service: getProducts()
activate Service

Service -> DB: prisma.product.findMany({\\n  where: { isAvailable: true, stock: { gt: 0 } },\\n  include: { category: true, sizePrices: ... }\\n})
activate DB

alt Lỗi truy vấn CSDL / Server Exception
    DB --> Service: Database error
    Service --> Controller: Ném Exception
    Controller --> ClientService: 500 Internal Server Error
    ClientService --> UI: throw ApiError(500)
    UI --> User: Hiển thị giao diện thông báo lỗi & nút Thử lại
else Truy vấn thành công
    DB --> Service: Danh sách Product entity
    deactivate DB

    Service -> Service: Map DTO: Decimal -> Number,\\nẩn trường tồn kho nội bộ
    Service --> Controller: ProductCatalogResponseDto
    deactivate Service

    Controller --> ClientService: 200 OK: { success: true, data: [...] }
    deactivate Controller

    ClientService --> UI: Return DTO array
    deactivate ClientService

    UI -> UI: Trích xuất danh mục và\\nnhóm sản phẩm theo category
    UI --> User: Hiển thị Tab danh mục & lưới đồ uống
end

opt Tìm kiếm theo từ khóa hoặc lọc danh mục
    User -> UI: Nhập tên món ("Cà phê") hoặc bấm Tab "Trà"
    UI -> UI: Lọc client-side không cần gọi lại API
    UI --> User: Cập nhật lưới sản phẩm tương ứng
end

opt Chọn xem chi tiết món
    User -> UI: Nhấp vào thẻ sản phẩm
    UI --> User: Điều hướng sang /products/[id]
    deactivate UI
end

@enduml
"""

DIAGRAMS['docs/product-detail/sequence-product-detail.puml'] = """@startuml sequence-product-detail
title Sơ Đồ Tuần Tự - Tùy Biến Sản Phẩm & Thêm Vào Giỏ (Product Detail)
autonumber
skinparam maxMessageSize 110
skinparam ParticipantPadding 6
skinparam BoxPadding 6
skinparam defaultFontSize 11
skinparam NoteFontSize 10
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6

actor "Khách hàng" as User
box "Frontend (Next.js & Zustand)" #F9F9F9
    participant "DetailPage & Hook" as UI
    participant "product.service" as ClientService
    participant "useCartStore" as CartStore
end box

box "Backend (NestJS)" #F0F7FF
    participant "ProductsController" as Controller
    participant "ProductsService" as Service
    participant "Prisma DB" as DB
end box

== 1. Tải thông tin chi tiết sản phẩm ==
User -> UI: Mở trang chi tiết đồ uống (/products/[id])
activate UI
UI -> ClientService: getProductById(id)
activate ClientService

ClientService -> Controller: GET /api/v1/products/:id
activate Controller
Controller -> Service: getProductDetail(id)
activate Service

Service -> DB: prisma.product.findUnique({\\n  where: { id },\\n  include: { category: true, sizePrices: true }\\n})
activate DB

alt Không tìm thấy sản phẩm
    DB --> Service: null
    Service --> Controller: 404 Not Found Exception
    Controller --> ClientService: 404 Not Found
    ClientService --> UI: throw ApiError(404)
    UI --> User: Hiển thị thông báo "Không tìm thấy món"
else Tìm thấy sản phẩm
    DB --> Service: Entity Product kèm bảng phụ Size/Toppings
    deactivate DB
    Service --> Controller: ProductDetailResponseDto
    deactivate Service
    Controller --> ClientService: 200 OK: { success: true, data: {...} }
    deactivate Controller
    ClientService --> UI: Dữ liệu chi tiết sản phẩm
    deactivate ClientService
    UI --> User: Hiển thị thông tin món, giá gốc ly S, tùy chọn Size & Topping
end

== 2. Tùy biến món & Tính toán chi phí tạm tính ==
loop Người dùng tương tác cấu hình món
    User -> UI: Chọn Size (S/M/L), chọn/bỏ chọn Topping, tăng giảm số lượng
    UI -> UI: Tự động tính toán lại đơn giá thời gian thực:\\nunitPrice = basePrice + sizePrice + Σ toppingPrice\\nlineTotal = unitPrice * quantity
    UI --> User: Cập nhật tổng tiền tạm tính trên nút "Thêm vào giỏ hàng"
end

== 3. Thêm sản phẩm tùy biến vào giỏ hàng ==
User -> UI: Nhấn nút "Thêm vào giỏ hàng"
UI -> CartStore: addItem({\\n  productId, name, size, toppings, unitPrice, quantity\\n})
activate CartStore

CartStore -> CartStore: Sinh cartItemId duy nhất:\\n`${productId}-${size}-${sortedToppings.join('-')}`
alt Dòng món đã tồn tại cùng cấu hình
    CartStore -> CartStore: Tăng số lượng (tối đa 99 ly)
else Cấu hình món mới
    CartStore -> CartStore: Thêm dòng CartItem mới vào danh sách
end

CartStore -> CartStore: Tính lại totalAmount & badgeCount
CartStore -> CartStore: Lưu đồng bộ vào LocalStorage ('brewlite_cart')
CartStore --> UI: Trạng thái giỏ hàng đã cập nhật
deactivate CartStore

UI --> User: Hiển thị Toast "Đã thêm vào giỏ hàng thành công", cập nhật badge Header
deactivate UI

@enduml
"""

# ==========================================
# 4. ARCHITECTURE DIAGRAMS (Vertical Tiers)
# ==========================================

DIAGRAMS['docs/architecture/deployment-docker.puml'] = """@startuml deployment-docker
title Sơ Đồ Triển Khai Docker Compose (3-Tier Architecture)
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 8
skinparam packageStyle rectangle
skinparam nodesep 14
skinparam ranksep 16

skinparam node {
    BackgroundColor #FAFAFA
    BorderColor #2D3748
}
skinparam component {
    BackgroundColor #FFFFFF
    BorderColor #3182CE
}
skinparam database {
    BackgroundColor #EDF2F7
    BorderColor #2B6CB0
}

actor "Khách hàng / Trình duyệt\\n(Client Browser)" as User

node "Host Machine (Docker Engine)" as Host {
    node "Docker Network (Bridge: default)" as Net {

        ' Tier 1: Frontend
        node "Container: brewlite_frontend" as FrontendContainer {
            component "Next.js 14/15 Production Server\\n(Port 3000:3000)" as NextServer
            note right of NextServer
                **Frontend Config:**
                * NEXT_PUBLIC_API_URL: /api/v1
                * Image: ./frontend/Dockerfile
                * restart: always
            end note
        }

        ' Tier 2: Backend
        node "Container: brewlite_backend" as BackendContainer {
            component "NestJS Application Server\\n(Port 4000:4000)" as NestServer
            note right of NestServer
                **Backend Config:**
                * PORT: 4000
                * JWT_SECRET: brewlite_key_2026
                * Prisma migrate deploy
                * restart: always
            end note
        }

        ' Tier 3: Database
        node "Container: brewlite_postgres" as PostgresContainer {
            database "PostgreSQL 16 Engine\\n(Port 5432:5432)" as PG_Engine
            storage "Docker Volume:\\nbrewlite_postgres_data" as PG_Vol
            PG_Engine -right-> PG_Vol : /var/lib/postgresql/data
            note right of PG_Engine
                **Database Config:**
                * User: brewlite_admin
                * DB: brewlite_db
                * Healthcheck: pg_isready
            end note
        }
    }
}

' External User access
User --> NextServer : HTTP: 3000 (Giao diện Web)
User --> NestServer : HTTP: 4000 (REST API / Swagger)

' Internal tier-to-tier connections
NextServer -down-> NestServer : depends_on: [backend]\\nGọi REST API nội bộ
NestServer -down-> PG_Engine : depends_on: [postgres:healthy]\\nPrisma Client TCP 5432

FrontendContainer -[hidden]down-> BackendContainer
BackendContainer -[hidden]down-> PostgresContainer

@enduml
"""

DIAGRAMS['docs/architecture/component-architecture.puml'] = """@startuml component-architecture
title Kiến Trúc Thành Phần Hệ Thống BrewLite (Component Architecture)
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam nodesep 12
skinparam ranksep 14
skinparam defaultFontSize 11
skinparam componentFontSize 10
skinparam componentStyle uml2
skinparam packageStyle rectangle

skinparam node {
    BackgroundColor #FAFAFA
    BorderColor #4A5568
}
skinparam component {
    BackgroundColor #FFFFFF
    BorderColor #2B6CB0
    ArrowColor #2D3748
}
skinparam database {
    BackgroundColor #EDF2F7
    BorderColor #2D3748
}

actor "Khách hàng (Client Web Browser)" as Client

node "Frontend Container (Next.js - Port 3000)" as FE_Node {
    component [UI Pages & Components\\n(Menu, Detail, Cart, Checkout, Orders, Auth)] as UI
    component [Client Stores & Hooks\\n(useCartStore, useAuthStore, React Hooks)] as StateStore
    component [API Services\\n(auth, product, order, payment services)] as ApiClient
    
    UI -> StateStore : Quản lý state
    UI -> ApiClient : Gọi API
}

node "Backend Container (NestJS - Port 4000)" as BE_Node {
    component [HTTP Pipeline (CORS, ValidationPipe, Interceptor, Guard)] as Middleware

    package "Business Modules" {
        component [AuthModule\\n(Auth, JWT)] as AuthMod
        component [ProductsModule\\n(Catalog & Detail)] as ProductsMod
        component [OrdersModule\\n(Creation, Cancel, History)] as OrdersMod
        component [PaymentsModule\\n(Payment & Idempotency)] as PaymentsMod
        component [Pricing & Promotions\\n(PricingService, PromotionsService)] as PricingMod
        component [LoyaltyModule\\n(LoyaltyPoints)] as LoyaltyMod
    }

    component [Prisma ORM Module\\n(PrismaService)] as PrismaMod
    component [Mock Payment Gateway\\n(MockGatewayService)] as MockGateway
}

node "Database Container (Port 5432)" as DB_Node {
    database "PostgreSQL 16 (brewlite_db)" as PostgresDB {
        folder "Relational Tables (schema: public)" {
            [users / categories / products / product_size_prices]
            [toppings / promotions / orders / order_items]
            [order_item_toppings / payments / loyalty_transactions]
        }
    }
}

' External interactions
Client --> UI : Tương tác trực tiếp (HTTP/HTML/JS)
ApiClient --> Middleware : RESTful HTTP Request (/api/v1/*)\\n[Bearer JWT / Idempotency-Key]

' Backend routing
Middleware --> AuthMod
Middleware --> ProductsMod
Middleware --> OrdersMod
Middleware --> PaymentsMod

' Inter-module relations
OrdersMod ..> PricingMod : Tính tiền & phụ thu
PaymentsMod ..> OrdersMod : Cập nhật trạng thái
PaymentsMod ..> MockGateway : Xử lý cổng thanh toán
PaymentsMod ..> LoyaltyMod : Tích lũy điểm thưởng

AuthMod --> PrismaMod
ProductsMod --> PrismaMod
OrdersMod --> PrismaMod
PaymentsMod --> PrismaMod
LoyaltyMod --> PrismaMod

PrismaMod --> PostgresDB : Prisma Client TCP 5432

FE_Node -[hidden]down-> BE_Node
BE_Node -[hidden]down-> DB_Node

@enduml
"""

DIAGRAMS['docs/architecture/class-diagram-backend.puml'] = """@startuml class-diagram-backend
title Sơ Đồ Lớp Tầng Dịch Vụ Backend NestJS (Backend Services & Architecture)
skinparam defaultFontName Arial
skinparam shadowing false
skinparam roundcorner 6
skinparam nodesep 12
skinparam ranksep 14
skinparam classFontSize 10
skinparam classAttributeFontSize 9
skinparam packageFontSize 11
skinparam classAttributeIconSize 0
skinparam packageStyle rectangle

skinparam class {
    BackgroundColor #FFFFFF
    BorderColor #2B6CB0
    HeaderBackgroundColor #1A365D
    HeaderFontColor #FFFFFF
}

package "Controllers (API Layer)" #F8FAFC {
    class AuthController {
        + register(dto: RegisterDto)
        + login(dto: LoginDto)
    }

    class ProductsController {
        + getProducts()
        + getProductDetail(id: string)
    }

    class OrdersController {
        + create(userId, dto: CreateOrderDto)
        + cancel(orderId, userId)
        + getOrderHistory(userId, query)
        + getOrderDetail(orderId, userId)
    }

    class PaymentsController {
        + createPayment(userId, key, dto)
    }
}

package "Core Domain Services (NestJS Providers)" #EDF2F7 {
    class AuthService {
        + register(dto: RegisterDto)
        + login(dto: LoginDto)
    }

    class ProductsService {
        + getProducts()
        + getProductDetail(id: string)
    }

    class OrdersService {
        + create(userId, dto: CreateOrderDto)
        + cancel(orderId, userId)
        + getOrderHistory(userId, query)
        + getOrderDetail(orderId, userId)
    }

    class OrderStateMachine {
        + transition(tx, orderId, toStatus)
    }

    class PaymentsService {
        + createPayment(userId, key, dto)
        - replayExistingPayment(payment, hash)
    }

    class PricingService {
        + calculate(items: PricingItemInput[])
    }

    class PromotionsService {
        + validate(code, subtotal)
    }

    class LoyaltyService {
        + award(tx, order)
    }

    class MockGatewayService {
        + processPayment(mockOutcome?)
    }

    class PrismaService {
        + onModuleInit()
        + onModuleDestroy()
        + $transaction(fn)
    }
}

' Controllers invoke Services
AuthController --> AuthService
ProductsController --> ProductsService
OrdersController --> OrdersService
PaymentsController --> PaymentsService

' Inter-service collaboration
OrdersService --> PricingService : delegates pricing
OrdersService --> PromotionsService : validates coupon
OrdersService --> OrderStateMachine : transitions state
OrdersService --> PrismaService : uses transaction & locks

PaymentsService --> MockGatewayService : processPayment()
PaymentsService --> OrderStateMachine : updates to PAID
PaymentsService --> LoyaltyService : awards points
PaymentsService --> PrismaService : records payment

AuthService --> PrismaService
ProductsService --> PrismaService
LoyaltyService --> PrismaService

' 2-column layout constraints
AuthController -[hidden]down-> OrdersController
ProductsController -[hidden]down-> PaymentsController
AuthController -[hidden]right-> ProductsController

AuthService -[hidden]down-> ProductsService
ProductsService -[hidden]down-> PricingService
PricingService -[hidden]down-> PromotionsService
PromotionsService -[hidden]down-> MockGatewayService

OrdersService -[hidden]down-> PaymentsService
PaymentsService -[hidden]down-> OrderStateMachine
OrderStateMachine -[hidden]down-> LoyaltyService
LoyaltyService -[hidden]down-> PrismaService

AuthService -[hidden]right-> OrdersService

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
    print(f"Applying redesign to {len(DIAGRAMS)} diagrams...")
    
    figures_dir = 'report/figures'
    os.makedirs(figures_dir, exist_ok=True)
    
    for i, (path, content) in enumerate(DIAGRAMS.items(), 1):
        print(f"[{i}/{len(DIAGRAMS)}] Overwriting & rendering {path}...")
        
        # 1. Overwrite .puml
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
            
        base_name = os.path.splitext(os.path.basename(path))[0]
        puml_dir = os.path.dirname(path)
        
        doc_svg = os.path.join(puml_dir, f"{base_name}.svg")
        doc_png = os.path.join(puml_dir, f"{base_name}.png")
        fig_svg = os.path.join(figures_dir, f"{base_name}.svg")
        fig_png = os.path.join(figures_dir, f"{base_name}.png")
        
        # 2. Render via Kroki
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
            print(f"      -> ERROR rendering {base_name}: {e}")
            
        time.sleep(0.4)
        
    print("\nAll PUML files updated and rendered successfully!")

if __name__ == '__main__':
    main()
