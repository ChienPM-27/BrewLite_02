import urllib.request
import urllib.error
import json
import uuid
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://127.0.0.1:4000/api/v1'

results = []

def record(tc_id, name, expected_status, actual_status, passed, details=""):
    status_str = "PASS" if passed else "FAIL"
    results.append({
        'id': tc_id,
        'name': name,
        'expected': expected_status,
        'actual': actual_status,
        'status': status_str,
        'details': details
    })
    print(f"[{status_str}] {tc_id}: {name} (Expected: {expected_status}, Got: {actual_status})")
    if not passed and details:
        print(f"       Details: {details}")

def request(method, path, body=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode('utf-8')
            try:
                res_json = json.loads(content)
            except:
                res_json = content
            return status, res_json
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode('utf-8')
        try:
            res_json = json.loads(content)
        except:
            res_json = content
        return status, res_json
    except Exception as e:
        return 0, str(e)

print("="*70)
print("BREWLITE - FULL AUTOMATED API TEST RUNNER")
print("Target:", BASE_URL)
print("="*70)

# Check health
s, b = request('GET', '/health')
record("TC-SYS-HEALTH", "Hệ thống hoạt động bình thường (Healthcheck)", 200, s, s == 200)

# =========================================================================
# 1. AUTH MODULE
# =========================================================================
print("\n--- 1. AUTH MODULE ---")
test_email = f"qa_test_{int(time.time())}@brewlite.test"
test_pass = "Password@123"

# TC-AUTH-01: Register success
s, b = request('POST', '/auth/register', {
    'email': test_email,
    'password': test_pass,
    'fullName': 'QA Test User'
})
token_a = b.get('data', {}).get('accessToken') if isinstance(b, dict) and b.get('success') else None
user_id_a = b.get('data', {}).get('user', {}).get('id') if isinstance(b, dict) and b.get('success') else None
record("TC-AUTH-01", "Đăng ký tài khoản mới thành công", 201, s, s == 201 and token_a is not None)

# TC-AUTH-02: Register invalid data (short pass)
s, b = request('POST', '/auth/register', {
    'email': 'bad_email',
    'password': '123',
    'fullName': 'Bad User'
})
record("TC-AUTH-02", "Đăng ký với email sai format và mật khẩu ngắn", 400, s, s == 400)

# TC-AUTH-03: Register duplicate email
s, b = request('POST', '/auth/register', {
    'email': test_email,
    'password': test_pass,
    'fullName': 'QA Test User Duplicate'
})
record("TC-AUTH-03", "Đăng ký với email đã tồn tại", 409, s, s == 409)

# TC-AUTH-04: Login success
s, b = request('POST', '/auth/login', {
    'email': test_email,
    'password': test_pass
})
record("TC-AUTH-04", "Đăng nhập thành công và nhận JWT", 200, s, s == 200 and 'accessToken' in b.get('data', {}))

# TC-AUTH-05: Login wrong password
s, b = request('POST', '/auth/login', {
    'email': test_email,
    'password': 'WrongPassword123'
})
record("TC-AUTH-05", "Đăng nhập thất bại với sai mật khẩu", 401, s, s == 401)

# TC-AUTH-07: Guard route without token
s, b = request('GET', '/orders/me')
record("TC-AUTH-07", "Chặn truy cập route yêu cầu xác thực khi không có token", 401, s, s == 401)

# TC-AUTH-08: Guard route with invalid token
s, b = request('GET', '/orders/me', headers={'Authorization': 'Bearer invalid.token.value'})
record("TC-AUTH-08", "Chặn truy cập route khi token sai chữ ký hoặc không hợp lệ", 401, s, s == 401)

# Register User B for permission tests
user_b_email = f"qa_user_b_{int(time.time())}@brewlite.test"
s, b = request('POST', '/auth/register', {
    'email': user_b_email,
    'password': test_pass,
    'fullName': 'QA User B'
})
token_b = b.get('data', {}).get('accessToken') if isinstance(b, dict) else None

# =========================================================================
# 2. PRODUCTS & CATALOG MODULE
# =========================================================================
print("\n--- 2. PRODUCTS MODULE ---")

# TC-CAT-01: Get catalog
s, b = request('GET', '/products')
products = b.get('data', []) if isinstance(b, dict) and b.get('success') else []
passed_cat = (s == 200 and len(products) >= 10)
record("TC-CAT-01", "Lấy danh sách thực đơn sản phẩm thành công", 200, s, passed_cat, f"Số lượng: {len(products)}")

# TC-CAT-04: Security check: no stock field in /products
has_stock_field = any('stock' in p for p in products)
record("TC-CAT-04", "Kiểm tra bảo mật: không lộ trường stock trong mảng sản phẩm", 200, s, not has_stock_field, "Không có trường stock")

# TC-CAT-05: Alphabetical sort name ASC
names = [p.get('name', '') for p in products]
is_sorted = (names == sorted(names))
record("TC-CAT-05", "Kiểm tra danh sách sản phẩm sắp xếp theo tên tăng dần", 200, s, is_sorted)

# Select first product
sample_product = products[0] if products else None
sample_id = sample_product.get('id') if sample_product else 'none'

# TC-DET-01: Product detail with sizePrices and toppings
s, b = request('GET', f'/products/{sample_id}')
p_detail = b.get('data', {}) if isinstance(b, dict) and b.get('success') else {}
has_sizes = len(p_detail.get('sizePrices', [])) > 0
has_toppings = len(p_detail.get('toppings', [])) > 0
record("TC-DET-01", "Xem chi tiết sản phẩm kèm mảng sizePrices và toppings", 200, s, s == 200 and has_sizes and has_toppings)

# TC-DET-03: Product detail 404
s, b = request('GET', '/products/non-existent-product-id')
record("TC-DET-03", "Xem chi tiết sản phẩm không tồn tại", 404, s, s == 404)

# =========================================================================
# 3. ORDERS MODULE
# =========================================================================
print("\n--- 3. ORDERS MODULE ---")
auth_header_a = {'Authorization': f'Bearer {token_a}'}
auth_header_b = {'Authorization': f'Bearer {token_b}'}

# TC-CO-01: Create valid order
s, b = request('POST', '/orders', {
    'items': [{
        'productId': sample_id,
        'size': 'M',
        'quantity': 1,
        'toppingIds': []
    }]
}, headers=auth_header_a)
order_1 = b.get('data') if isinstance(b, dict) and b.get('success') else None
order_1_id = order_1.get('id') if order_1 else None
record("TC-CO-01", "Tạo đơn hàng hợp lệ trạng thái PENDING", 201, s, s == 201 and order_1_id is not None)

# TC-CO-03: Create order without token
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 1, 'toppingIds': []}]
})
record("TC-CO-03", "Chặn tạo đơn hàng khi chưa đăng nhập", 401, s, s == 401)

# TC-CO-05: Create order empty items
s, b = request('POST', '/orders', {'items': []}, headers=auth_header_a)
record("TC-CO-05", "Chặn tạo đơn hàng với giỏ hàng rỗng", 400, s, s == 400)

# TC-CO-07: Create order quantity exceeds max (100)
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 100, 'toppingIds': []}]
}, headers=auth_header_a)
record("TC-CO-07", "Chặn tạo đơn hàng với số lượng vượt giới hạn 99 ly", 400, s, s == 400)

# TC-CO-09: Create order invalid size
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'XL', 'quantity': 1, 'toppingIds': []}]
}, headers=auth_header_a)
record("TC-CO-09", "Chặn tạo đơn hàng với kích cỡ không hợp lệ (size XL)", 400, s, s == 400)

# TC-CO-10: Create order non-existent product
s, b = request('POST', '/orders', {
    'items': [{'productId': 'invalid-product-id-cuid', 'size': 'M', 'quantity': 1, 'toppingIds': []}]
}, headers=auth_header_a)
record("TC-CO-10", "Chặn tạo đơn hàng với sản phẩm không tồn tại", 400, s, s == 400)

# TC-CO-11a: Create order exceeds max 3 toppings
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 1, 'toppingIds': ['t1', 't2', 't3', 't4']}]
}, headers=auth_header_a)
record("TC-CO-11a", "Chặn chọn quá 3 loại topping cho một ly", 400, s, s == 400)

# TC-CO-13: Create order insufficient stock
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 99, 'toppingIds': []}]
}, headers=auth_header_a)
record("TC-CO-13", "Chặn tạo đơn hàng khi số lượng vượt tồn kho hiện có", 400, s, s == 400)

# TC-CO-18: Create order with valid voucher WELCOME10
# Find a product with basePrice >= 40000 or order quantity 2
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'L', 'quantity': 2, 'toppingIds': []}],
    'promotionCode': 'WELCOME10'
}, headers=auth_header_a)
order_promo = b.get('data') if isinstance(b, dict) and b.get('success') else None
promo_order_id = order_promo.get('id') if order_promo else None
discount_val = order_promo.get('discountAmount') if order_promo else 0
passed_promo = (s == 201 and discount_val is not None and float(discount_val) > 0)
record("TC-CO-18", "Tạo đơn hàng áp dụng mã voucher WELCOME10 thành công", 201, s, passed_promo, f"Giảm giá: {discount_val} VNĐ")

# TC-CO-19: Create order with invalid voucher
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 1, 'toppingIds': []}],
    'promotionCode': 'VOUCHER_KHONG_TON_TAI'
}, headers=auth_header_a)
record("TC-CO-19", "Chặn tạo đơn với mã khuyến mại không hợp lệ", 400, s, s == 400)

# TC-CX-01: Cancel PENDING order
s, b = request('POST', f'/orders/{order_1_id}/cancel', headers=auth_header_a)
cancelled_status = b.get('data', {}).get('status') if isinstance(b, dict) else None
record("TC-CX-01", "Chủ đơn hủy đơn hàng ở trạng thái PENDING thành công", 200, s, s == 200 and cancelled_status == 'CANCELLED')

# TC-CX-03: Cancel already cancelled order (State Machine reject)
s, b = request('POST', f'/orders/{order_1_id}/cancel', headers=auth_header_a)
record("TC-CX-03", "Chặn hủy lại đơn hàng đã ở trạng thái CANCELLED (409 Conflict)", 409, s, s == 409)

# TC-CX-04: User B cancel User A's order
s, b = request('POST', f'/orders/{promo_order_id}/cancel', headers=auth_header_b)
record("TC-CX-04", "Chặn hủy đơn hàng thuộc sở hữu của người dùng khác (404 Not Found)", 404, s, s == 404)

# TC-CX-05: Cancel without token
s, b = request('POST', f'/orders/{promo_order_id}/cancel')
record("TC-CX-05", "Chặn hủy đơn hàng khi chưa xác thực", 401, s, s == 401)

# =========================================================================
# 4. PAYMENTS MODULE
# =========================================================================
print("\n--- 4. PAYMENTS MODULE ---")

# Create fresh order for payment
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 1, 'toppingIds': []}]
}, headers=auth_header_a)
order_pay_id = b.get('data', {}).get('id')

# TC-PAY-01: E_WALLET payment success (201 Created)
key_1 = str(uuid.uuid4())
s, b = request('POST', '/payments', {
    'orderId': order_pay_id,
    'method': 'E_WALLET'
}, headers={**auth_header_a, 'idempotency-key': key_1})
pay_res = b.get('data') if isinstance(b, dict) else {}
record("TC-PAY-01", "Thanh toán bằng ví điện tử thành công (HTTP 201, status SUCCESS)", 201, s, s == 201 and pay_res.get('status') == 'SUCCESS')

# TC-PAY-10: Idempotency replay with same key & payload
s, b = request('POST', '/payments', {
    'orderId': order_pay_id,
    'method': 'E_WALLET'
}, headers={**auth_header_a, 'idempotency-key': key_1})
pay_replay = b.get('data') if isinstance(b, dict) else {}
record("TC-PAY-10", "Gửi lại cùng Idempotency-Key và payload: trả kết quả cũ (replay)", 201, s, s == 201 and pay_replay.get('id') == pay_res.get('id'))

# TC-PAY-11: Idempotency conflict with same key but different payload
s, b = request('POST', '/payments', {
    'orderId': order_pay_id,
    'method': 'BANK_CARD'
}, headers={**auth_header_a, 'idempotency-key': key_1})
record("TC-PAY-11", "Trùng Idempotency-Key nhưng khác payload trả 409 Conflict", 409, s, s == 409)

# TC-PAY-09: Order already paid: reject new payment
key_2 = str(uuid.uuid4())
s, b = request('POST', '/payments', {
    'orderId': order_pay_id,
    'method': 'BANK_CARD'
}, headers={**auth_header_a, 'idempotency-key': key_2})
record("TC-PAY-09", "Chặn thanh toán đơn hàng đã ở trạng thái PAID (409 Conflict)", 409, s, s == 409)

# TC-PAY-04: Missing orderId
s, b = request('POST', '/payments', {
    'method': 'E_WALLET'
}, headers={**auth_header_a, 'idempotency-key': str(uuid.uuid4())})
record("TC-PAY-04", "Từ chối request thanh toán khi thiếu orderId", 400, s, s == 400)

# TC-PAY-06: Invalid payment method
s, b = request('POST', '/payments', {
    'orderId': order_pay_id,
    'method': 'CRYPTO_COIN'
}, headers={**auth_header_a, 'idempotency-key': str(uuid.uuid4())})
record("TC-PAY-06", "Từ chối phương thức thanh toán không được hỗ trợ", 400, s, s == 400)

# TC-PAY-07: Non-existent order
s, b = request('POST', '/payments', {
    'orderId': 'non-existent-order-id',
    'method': 'E_WALLET'
}, headers={**auth_header_a, 'idempotency-key': str(uuid.uuid4())})
record("TC-PAY-07", "Từ chối thanh toán với orderId không tồn tại", 404, s, s == 404)

# TC-PAY-08: User B pay User A's order
# Create order for User A
s, b = request('POST', '/orders', {
    'items': [{'productId': sample_id, 'size': 'M', 'quantity': 1, 'toppingIds': []}]
}, headers=auth_header_a)
user_a_order_2 = b.get('data', {}).get('id')

s, b = request('POST', '/payments', {
    'orderId': user_a_order_2,
    'method': 'E_WALLET'
}, headers={**auth_header_b, 'idempotency-key': str(uuid.uuid4())})
record("TC-PAY-08", "Chặn thanh toán đơn hàng của người dùng khác (404 Not Found)", 404, s, s == 404)

# TC-PAY-03 & TC-PAY-16: Mock Gateway Failure with X-Mock-Outcome: FAILED
key_failed = str(uuid.uuid4())
s, b = request('POST', '/payments', {
    'orderId': user_a_order_2,
    'method': 'BANK_CARD'
}, headers={**auth_header_a, 'idempotency-key': key_failed, 'x-mock-outcome': 'FAILED'})
fail_payment = b.get('data') if isinstance(b, dict) else {}
record("TC-PAY-03", "Giả lập thanh toán lỗi qua header X-Mock-Outcome: FAILED", 201, s, s == 201 and fail_payment.get('status') == 'FAILED')

# TC-PAY-13: Retry payment after failure with new key
key_retry = str(uuid.uuid4())
s, b = request('POST', '/payments', {
    'orderId': user_a_order_2,
    'method': 'E_WALLET'
}, headers={**auth_header_a, 'idempotency-key': key_retry, 'x-mock-outcome': 'SUCCESS'})
retry_payment = b.get('data') if isinstance(b, dict) else {}
record("TC-PAY-13", "Thử lại thanh toán sau thất bại với Idempotency-Key mới thành công", 201, s, s == 201 and retry_payment.get('status') == 'SUCCESS')

# =========================================================================
# 5. ORDER HISTORY MODULE
# =========================================================================
print("\n--- 5. ORDER HISTORY MODULE ---")

# TC-HIS-01: Get order history for User A
s, b = request('GET', '/orders/me', headers=auth_header_a)
history_data = b.get('data', {}) if isinstance(b, dict) and b.get('success') else {}
history_items = history_data.get('items', [])
pagination = history_data.get('pagination', {})
record("TC-HIS-01", "Lấy danh sách lịch sử đơn hàng của người dùng thành công", 200, s, s == 200 and len(history_items) > 0)

# TC-HIS-02: Get order history for User with no orders (create new user)
s_temp, b_temp = request('POST', '/auth/register', {
    'email': f'empty_user_{int(time.time())}@brewlite.test',
    'password': 'Password@123',
    'fullName': 'Empty User'
})
token_empty = b_temp.get('data', {}).get('accessToken') if isinstance(b_temp, dict) else None
s, b = request('GET', '/orders/me', headers={'Authorization': f'Bearer {token_empty}'})
empty_items = b.get('data', {}).get('items', []) if isinstance(b, dict) else None
record("TC-HIS-02", "Tra cứu lịch sử của tài khoản mới chưa có đơn hàng", 200, s, s == 200 and len(empty_items) == 0)

# TC-HIS-08: Filter order history by status PAID
s, b = request('GET', '/orders/me?status=PAID', headers=auth_header_a)
paid_items = b.get('data', {}).get('items', []) if isinstance(b, dict) else []
all_paid = all(item.get('status') == 'PAID' for item in paid_items) if paid_items else False
record("TC-HIS-08", "Lọc lịch sử đơn hàng theo trạng thái hợp lệ (status=PAID)", 200, s, s == 200 and all_paid)

# TC-HIS-09: Filter by invalid status
s, b = request('GET', '/orders/me?status=INVALID_STATUS_VALUE', headers=auth_header_a)
record("TC-HIS-09", "Chặn lọc lịch sử theo trạng thái không hợp lệ", 400, s, s == 400)

# TC-HIS-10: Get order detail of own order
s, b = request('GET', f'/orders/{order_pay_id}', headers=auth_header_a)
detail_data = b.get('data', {}) if isinstance(b, dict) else {}
record("TC-HIS-10", "Xem chi tiết đơn hàng của chính mình thành công", 200, s, s == 200 and detail_data.get('id') == order_pay_id)

# TC-HIS-11: User B views User A's order detail -> 404
s, b = request('GET', f'/orders/{order_pay_id}', headers=auth_header_b)
record("TC-HIS-11", "Chặn xem chi tiết đơn hàng thuộc sở hữu của người dùng khác (404 Not Found)", 404, s, s == 404)

# TC-HIS-12: View non-existent order detail
s, b = request('GET', '/orders/non-existent-order-id-cuid', headers=auth_header_a)
record("TC-HIS-12", "Tra cứu chi tiết đơn hàng với ID không tồn tại (404 Not Found)", 404, s, s == 404)

print("\n" + "="*70)
print(f"SUMMARY: Total API tests executed: {len(results)}")
passed_cnt = sum(1 for r in results if r['status'] == 'PASS')
failed_cnt = sum(1 for r in results if r['status'] == 'FAIL')
print(f"PASSED: {passed_cnt}/{len(results)} ({passed_cnt/len(results)*100:.1f}%)")
print(f"FAILED: {failed_cnt}/{len(results)}")
print("="*70)
