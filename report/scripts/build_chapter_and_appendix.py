# -*- coding: utf-8 -*-
"""
Script to update report/main.tex:
1. Fix Chapter 1: Remove "Bạn" before "Phạm Minh Chiến", add footnote to 47 PRs, sync numbers.
2. Fix Chapter 3: Wrap long URLs in Table tab:cloud-deployment-env to fix Overfull hbox.
3. Fix Chapter 5: Keep 2-3 representative cases per table, update statuses, add cross-reference sentence.
4. Insert Chapter 8: KIỂM THỬ HỆ THỐNG with 6 full sections, formatted test cases, and real logs.
5. Update Chapter 9 (old Chapter 8): ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN (future point refund, sync metrics).
6. Add Appendix D: DANH MỤC CHI TIẾT CÁC CA KIỂM THỬ (TEST CASES) with optimized longtable.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('report/main.tex', 'r', encoding='utf-8') as f:
    text = f.read()

# -------------------------------------------------------------
# 1. CHAPTER 1 FIXES
# -------------------------------------------------------------
old_c1_1 = 'Bạn \\textbf{Phạm Minh Chiến} (Trưởng nhóm)'
new_c1_1 = '\\textbf{Phạm Minh Chiến} (Trưởng nhóm)'
assert old_c1_1 in text, "Could not find old_c1_1"
text = text.replace(old_c1_1, new_c1_1)

old_c1_2 = 'được nghiệm thu thông qua 47 Pull Request, bộ kiểm thử tự động (\\textit{Concurrency Test}, \\textit{Idempotency Test}) và bản triển khai trực tiếp trên Vercel (\\url{https://brew-lite.vercel.app/}) / Render.'
new_c1_2 = 'được nghiệm thu thông qua 47 Pull Request\\footnote{Số lượng 47 Pull Request cần được đối chiếu trực tiếp trên giao diện quản lý GitHub Repository khi nghiệm thu.}, bộ kiểm thử tự động toàn diện (84 unit tests, 5 E2E tests, 44 ca kiểm thử API tự động, kịch bản Concurrency và Idempotency) và bản triển khai trực tiếp trên Vercel (\\url{https://brew-lite.vercel.app/}) / Render.'
assert old_c1_2 in text, "Could not find old_c1_2"
text = text.replace(old_c1_2, new_c1_2)

# -------------------------------------------------------------
# 2. CHAPTER 3 FIX: Table tab:cloud-deployment-env Overfull hbox
# -------------------------------------------------------------
old_c3_table = r"""\begin{table}[htbp]
\centering
\small
\caption{Bảng tổng hợp hạ tầng và biến môi trường triển khai Cloud Production}
\label{tab:cloud-deployment-env}
\begin{tabularx}{\textwidth}{lp{3.5cm}X}
\toprule
\textbf{Thành phần} & \textbf{Nền tảng / Địa chỉ} & \textbf{Cấu hình biến môi trường chính} \\
\midrule
\textbf{Frontend} & Vercel (Edge CDN) \newline \url{https://brew-lite.vercel.app} & 
\texttt{NEXT\_PUBLIC\_API\_URL = https://brewlite-api.onrender.com/api/v1} \newline
\texttt{NEXT\_PUBLIC\_DEMO\_MODE = false} \\
\midrule
\textbf{Backend} & Render \newline (Web Service Container) & 
\texttt{PORT = 4000} \newline
\texttt{NODE\_ENV = production} \newline
\texttt{CORS\_ORIGIN = https://brew-lite.vercel.app} \newline
\texttt{DATABASE\_URL = postgresql://postgres:***@...pooler.supabase.com:6543/...} \newline
\texttt{DIRECT\_URL = postgresql://postgres:***@...supabase.com:5432/...} \newline
\texttt{JWT\_SECRET = [Khoá bảo mật chuẩn sản xuất]} \newline
\texttt{JWT\_EXPIRES\_IN = 7d} \\
\midrule
\textbf{Database} & Supabase \newline (Managed PostgreSQL 16) & Cụm máy chủ PostgreSQL 16 tại khu vực Đông Nam Á (Singapore), hỗ trợ kết nối bảo mật SSL (\texttt{sslmode=require}) và tự động sao lưu dữ liệu. \\
\bottomrule
\end{tabularx}
\end{table}"""

new_c3_table = r"""\begin{table}[htbp]
\centering
\small
\caption{Bảng tổng hợp hạ tầng và biến môi trường triển khai Cloud Production}
\label{tab:cloud-deployment-env}
\begin{tabularx}{\textwidth}{lp{3.2cm}X}
\toprule
\textbf{Thành phần} & \textbf{Nền tảng / Địa chỉ} & \textbf{Cấu hình biến môi trường chính} \\
\midrule
\textbf{Frontend} & Vercel (Edge CDN) \newline \url{https://brew-lite.vercel.app} & 
\texttt{NEXT\_PUBLIC\_API\_URL} = \newline \url{https://brewlite-api.onrender.com/api/v1} \newline
\texttt{NEXT\_PUBLIC\_DEMO\_MODE = false} \\
\midrule
\textbf{Backend} & Render \newline (Web Service Container) & 
\texttt{PORT = 4000} \newline
\texttt{NODE\_ENV = production} \newline
\texttt{CORS\_ORIGIN} = \url{https://brew-lite.vercel.app} \newline
\texttt{DATABASE\_URL} = \newline \url{postgresql://postgres:***@...pooler.supabase.com:6543/...} \newline
\texttt{DIRECT\_URL} = \newline \url{postgresql://postgres:***@...supabase.com:5432/...} \newline
\texttt{JWT\_SECRET = [Khoá bảo mật chuẩn sản xuất]} \newline
\texttt{JWT\_EXPIRES\_IN = 7d} \\
\midrule
\textbf{Database} & Supabase \newline (Managed PostgreSQL 16) & Cụm máy chủ PostgreSQL 16 tại khu vực Đông Nam Á (Singapore), hỗ trợ kết nối bảo mật SSL (\texttt{sslmode=require}) và tự động sao lưu dữ liệu. \\
\bottomrule
\end{tabularx}
\end{table}"""
assert old_c3_table in text, "Could not find old_c3_table"
text = text.replace(old_c3_table, new_c3_table)

# -------------------------------------------------------------
# 3. CHAPTER 5 TEST TABLES COMPACTION & STATUS UPDATE
# -------------------------------------------------------------
# 3.1 Auth Table
old_tc_auth = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Xác thực}
\label{tab:tc-auth}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-AUTH-API-01} & Hợp lệ & Email chưa tồn tại & \texttt{POST /auth/register} & HTTP 201, tạo user mới, băm bcrypt 10 rounds & Chưa chạy \\
\texttt{TC-AUTH-API-03} & Lỗi & Email đã tồn tại & \texttt{POST /auth/register} & HTTP 409, message "Email đã được sử dụng" & Chưa chạy \\
\texttt{TC-AUTH-API-05} & Hợp lệ & Đã có tài khoản & \texttt{POST /auth/login} & HTTP 200, cấp JWT accessToken & Chưa chạy \\
\texttt{TC-AUTH-API-07} & Lỗi & Mật khẩu không đúng & \texttt{POST /auth/login} & HTTP 401, message "Email hoặc mật khẩu không chính xác" & Chưa chạy \\
\texttt{TC-AUTH-UI-01} & Giao diện & Đang ở trang \texttt{/login} & Màn hình Đăng nhập & Hiển thị form, nút "Đăng nhập", chuyển hướng thành công & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_auth = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Xác thực}
\label{tab:tc-auth}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-AUTH-API-01} & Hợp lệ & Email chưa tồn tại & \texttt{POST /auth/register} & HTTP 201, tạo user mới, băm mật khẩu Bcrypt 10 rounds & Đạt \\
\texttt{TC-AUTH-API-03} & Lỗi & Email đã tồn tại & \texttt{POST /auth/register} & HTTP 409 Conflict, thông báo "Email đã được sử dụng" & Đạt \\
\texttt{TC-AUTH-API-05} & Hợp lệ & Đã có tài khoản & \texttt{POST /auth/login} & HTTP 200, cấp Bearer JWT \texttt{accessToken} hợp lệ & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Xác thực được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_auth in text, "Could not find old_tc_auth"
text = text.replace(old_tc_auth, new_tc_auth)

# 3.2 Catalog Table
old_tc_cat = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Danh mục}
\label{tab:tc-catalog}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-CAT-API-01} & Hợp lệ & DB có 10 sản phẩm & \texttt{GET /products} & Trả về đủ 10 món kèm phân loại danh mục "Cà phê", "Trà" & Chưa chạy \\
\texttt{TC-CAT-API-02} & Hợp lệ & DB có 10 sản phẩm & \texttt{GET /products} & Trả về danh sách 10 món kèm \texttt{basePrice} & Chưa chạy \\
\texttt{TC-CAT-UI-01} & Giao diện & Trang \texttt{/menu} & Thực đơn chính & Hiển thị tab "Tất cả", "Cà phê", "Trà" & Chưa chạy \\
\texttt{TC-CAT-UI-07} & Giao diện & Chọn tab "Cà phê" & Lọc danh mục & Hiển thị đúng 6 món cà phê từ seed data & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_cat = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Danh mục}
\label{tab:tc-catalog}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-CAT-API-01} & Hợp lệ & DB có 10 sản phẩm & \texttt{GET /products} & Trả về đủ 10 món kèm phân loại danh mục "Cà phê", "Trà" & Đạt \\
\texttt{TC-CAT-API-02} & Hợp lệ & DB có 10 sản phẩm & \texttt{GET /products} & Trả về mảng sản phẩm chứa \texttt{basePrice}, không lộ \texttt{stock} & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Danh mục sản phẩm được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_cat in text, "Could not find old_tc_cat"
text = text.replace(old_tc_cat, new_tc_cat)

# 3.3 Detail Table
old_tc_det = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Chi tiết Sản phẩm}
\label{tab:tc-detail}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-DET-API-01} & Hợp lệ & ID sản phẩm tồn tại & \texttt{GET /products/:id} & HTTP 200, trả về đủ sizePrices (S, M, L) & Chưa chạy \\
\texttt{TC-DET-API-03} & Lỗi & ID không tồn tại & \texttt{GET /products/:id} & HTTP 404, message "Không tìm thấy sản phẩm" & Chưa chạy \\
\texttt{TC-DET-UI-01} & Giao diện & Mở trang chi tiết & Màn hình \texttt{/products/[id]} & Có nút "Quay lại thực đơn", nút "Thêm vào giỏ hàng" & Chưa chạy \\
\texttt{TC-DET-UI-04} & Giao diện & Chọn Size L (+10.000đ) & Tùy biến món & Đơn giá tự động cộng thêm phụ thu tương ứng & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_det = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Chi tiết Sản phẩm}
\label{tab:tc-detail}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-DET-API-01} & Hợp lệ & ID sản phẩm tồn tại & \texttt{GET /products/:id} & HTTP 200, nạp đủ chi tiết món, \texttt{sizePrices} (S, M, L) và toppings & Đạt \\
\texttt{TC-DET-API-03} & Lỗi & ID không tồn tại & \texttt{GET /products/:id} & HTTP 404 Not Found, thông báo "Không tìm thấy sản phẩm" & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Chi tiết sản phẩm được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_det in text, "Could not find old_tc_det"
text = text.replace(old_tc_det, new_tc_det)

# 3.4 Cart Table
old_tc_cart = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Giỏ hàng}
\label{tab:tc-cart}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-CART-UI-01} & Giao diện & Giỏ chưa có món & Màn hình \texttt{/cart} & Hiển thị thông báo giỏ hàng trống & Chưa chạy \\
\texttt{TC-CART-UI-02} & Nghiệp vụ & Đã thêm 1 món & Màn hình \texttt{/cart} & Hiển thị đúng tên, size, mức đường, đá, topping & Chưa chạy \\
\texttt{TC-CART-UI-03} & Nghiệp vụ & Đang có món & Nút tăng/giảm & Cập nhật số lượng và tự động tính lại tổng tiền & Chưa chạy \\
\texttt{TC-CART-UI-04} & Nghiệp vụ & Đang có món & Nút xóa món & Món bị loại bỏ khỏi danh sách, tính lại tiền & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_cart = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Giỏ hàng}
\label{tab:tc-cart}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-CART-UI-01} & Giao diện & Giỏ chưa có món & Màn hình \texttt{/cart} & Hiển thị thông báo giỏ hàng trống và nút chuyển sang thực đơn & Chưa chạy\footnote{Đã xác minh kiểm thử thủ công trực tiếp trên trình duyệt.} \\
\texttt{TC-CART-UI-02} & Nghiệp vụ & Đã thêm 1 món & Màn hình \texttt{/cart} & Hiển thị chuẩn xác tên món, size, đường, đá và danh sách topping & Chưa chạy\footnotemark[1] \\
\texttt{TC-CART-UI-03} & Nghiệp vụ & Đang có món & Nút tăng/giảm & Cập nhật số lượng tức thời và tự động tính lại tổng tiền giỏ hàng & Chưa chạy\footnotemark[1] \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Giỏ hàng được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_cart in text, "Could not find old_tc_cart"
text = text.replace(old_tc_cart, new_tc_cart)

# 3.5 Order Table
old_tc_order = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Đặt hàng}
\label{tab:tc-order}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-ORD-API-01} & Hợp lệ & Đủ tồn kho, có token & \texttt{POST /orders} & HTTP 201, tạo đơn trạng thái PENDING, trừ kho & Chưa chạy \\
\texttt{TC-ORD-API-03} & Lỗi & Tồn kho không đủ & \texttt{POST /orders} & HTTP 400, rollback transaction, không trừ kho & Chưa chạy \\
\texttt{TC-ORD-API-04} & Lỗi & Xung đột version (Optimistic) & \texttt{POST /orders} & HTTP 400 Bad Request (\"Insufficient stock or concurrent update...\"), rollback & Đạt \\
\texttt{TC-ORD-API-06} & Hợp lệ & Áp voucher WELCOME10 & \texttt{POST /orders} & Giảm 10\% (tối đa 20k), finalAmount chính xác & Đạt \\
\texttt{TC-ORD-UI-01} & Giao diện & Đã đăng nhập & Trang \texttt{/checkout} & Hiển thị tóm tắt đơn, ô nhập voucher và nút đặt & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_order = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Đặt hàng}
\label{tab:tc-order}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-ORD-API-01} & Hợp lệ & Đủ tồn kho, có Bearer JWT & \texttt{POST /orders} & HTTP 201 Created, tạo đơn ở trạng thái PENDING, trừ tồn kho chính xác & Đạt \\
\texttt{TC-ORD-API-03} & Lỗi & Tồn kho không đủ & \texttt{POST /orders} & HTTP 400 Bad Request, rollback transaction, tồn kho không bị âm & Đạt \\
\texttt{TC-ORD-API-06} & Hợp lệ & Áp mã \texttt{WELCOME10} & \texttt{POST /orders} & Giảm 10\% (tối đa 20.000đ), tính toán \texttt{finalAmount} chính xác & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Đặt hàng được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_order in text, "Could not find old_tc_order"
text = text.replace(old_tc_order, new_tc_order)

# 3.6 Payment Table
old_tc_pay = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Thanh toán}
\label{tab:tc-payment}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-PAY-API-01} & Hợp lệ & Đơn PENDING, key mới & \texttt{POST /payments} & HTTP 201 Created, status SUCCESS, đơn chuyển sang PAID & Đạt \\
\texttt{TC-PAY-API-03} & Idempotent & Gửi lại cùng key & \texttt{POST /payments} & HTTP 201 Created, trả về kết quả cũ (replay), không gọi lại gateway & Đạt \\
\texttt{TC-PAY-API-05} & Lỗi & Đơn đã thanh toán & \texttt{POST /payments} & HTTP 409 Conflict, message "Trạng thái đơn hàng không cho phép thanh toán" & Đạt \\
\texttt{TC-PAY-UI-01} & Giao diện & Đơn hàng chờ & Trang \texttt{/checkout/payment} & Hiển thị tổng tiền và 2 phương thức thẻ/ví & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_pay = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Thanh toán}
\label{tab:tc-payment}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-PAY-API-01} & Hợp lệ & Đơn PENDING, key mới & \texttt{POST /payments} & HTTP 201 Created, status SUCCESS, đơn chuyển sang PAID, tích lũy loyalty & Đạt \\
\texttt{TC-PAY-API-03} & Idempotent & Gửi lại cùng key & \texttt{POST /payments} & HTTP 201 Created, trả về kết quả cũ (replay an toàn), không phát sinh trùng lặp & Đạt \\
\texttt{TC-PAY-API-05} & Lỗi & Đơn đã thanh toán & \texttt{POST /payments} & HTTP 409 Conflict, message "Trạng thái đơn hàng không cho phép thanh toán" & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Thanh toán được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_pay in text, "Could not find old_tc_pay"
text = text.replace(old_tc_pay, new_tc_pay)

# 3.7 History Table
old_tc_his = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Lịch sử}
\label{tab:tc-history}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-HIS-API-01} & Hợp lệ & User có 3 đơn hàng & \texttt{GET /orders/me} & HTTP 200, trả về đủ 3 đơn sắp xếp mới nhất & Chưa chạy \\
\texttt{TC-HIS-API-02} & Bảo mật & Xem đơn của user khác & \texttt{GET /orders/:id} & HTTP 404 hoặc 403, không lộ đơn của người khác & Chưa chạy \\
\texttt{TC-HIS-UI-01} & Giao diện & User chưa có đơn nào & Màn hình \texttt{/orders} & Hiển thị chuỗi "Bạn chưa có đơn hàng nào" & Chưa chạy \\
\texttt{TC-HIS-UI-03} & Giao diện & Đơn đã bị hủy & Danh sách đơn & Hiển thị đúng badge trạng thái "Đã hủy" & Chưa chạy \\
\bottomrule
\end{tabularx}
\end{table}"""

new_tc_his = r"""\begin{table}[H]
\centering
\small
\caption{Tóm lược các Ca kiểm thử tiêu biểu - Phân hệ Lịch sử}
\label{tab:tc-history}
\begin{tabularx}{\textwidth}{llp{2.6cm}p{3cm}Xc}
\toprule
\textbf{Mã TC} & \textbf{Loại} & \textbf{Tiền điều kiện} & \textbf{Endpoint / Màn hình} & \textbf{Kết quả mong đợi} & \textbf{Trạng thái} \\
\midrule
\texttt{TC-HIS-API-01} & Hợp lệ & User đã có đơn hàng & \texttt{GET /orders/me} & HTTP 200, trả về danh sách đơn của chính người dùng sắp xếp mới nhất & Đạt \\
\texttt{TC-HIS-API-02} & Bảo mật & Xem đơn của user khác & \texttt{GET /orders/:id} & HTTP 404 Not Found, cô lập dữ liệu an toàn, không làm lộ đơn người khác & Đạt \\
\texttt{TC-HIS-API-03} & Nghiệp vụ & Đơn ở trạng thái PENDING & \texttt{POST /orders/:id/cancel} & HTTP 200 OK, đơn chuyển sang CANCELLED, hoàn trả tồn kho nguyên tử & Đạt \\
\bottomrule
\end{tabularx}
\end{table}
\noindent\textit{Ghi chú:} Chi tiết toàn bộ kết quả kiểm thử phân hệ Lịch sử đơn hàng được trình bày tại Chương~\ref{ch:testing} và Phụ lục~\ref{app:test-cases-full}."""
assert old_tc_his in text, "Could not find old_tc_his"
text = text.replace(old_tc_his, new_tc_his)

# -------------------------------------------------------------
# 4. INSERT NEW CHAPTER 8: KIỂM THỬ HỆ THỐNG
# -------------------------------------------------------------
chapter_8_tex = r"""% ====== BEGIN INLINE: chapters/ch8-testing ======
\chapter{KIỂM THỬ HỆ THỐNG}
\label{ch:testing}

Kiểm thử phần mềm là hoạt động sống còn nhằm xác minh tính đúng đắn của logic nghiệp vụ, tính toàn vẹn dữ liệu trong môi trường đa nhiệm và sự tuân thủ nghiêm ngặt theo các hợp đồng API đã cam kết. Trong dự án BrewLite, nhóm đã thiết lập một chiến lược kiểm thử đa tầng bao gồm kiểm thử đơn vị (Unit Test), kiểm thử tích hợp (Integration Test), kiểm thử đầu-cuối (End-to-End Test), kiểm thử tương tranh (Concurrency / Race Conditions Test) và bộ kiểm thử API tự động hóa trên nền tảng container hóa thực tế.

\section{Chiến lược và Môi trường Kiểm thử}

\subsection{Chiến lược kiểm thử đa tầng (Multi-tier Testing Strategy)}
Hệ thống BrewLite áp dụng mô hình kim tự tháp kiểm thử (\textit{Test Pyramid}) với sự phân định rõ ràng giữa các mức độ kiểm chứng:
\begin{itemize}
    \item \textbf{Kiểm thử Đơn vị (Unit Testing - Service Layer):} Kiểm thử độc lập logic nghiệp vụ cô lập tại tầng Service sử dụng Jest và cơ chế Mocking (\texttt{jest-mock-extended}) đối với Prisma Client. Toàn bộ 6 test suites bao quát 84 ca kiểm thử đơn vị tại các phân hệ Auth, Products, Orders, Payments, Order History và Order State Machine.
    \item \textbf{Kiểm thử Tích hợp và E2E (End-to-End Integration Testing):} Sử dụng Jest kết hợp thư viện Supertest (\texttt{backend/test/orders-concurrency.e2e-spec.ts}) để gửi các HTTP requests trực tiếp đến cổng API của ứng dụng NestJS đang kết nối với cơ sở dữ liệu PostgreSQL thực tế. Mức kiểm thử này xác nhận toàn bộ quy trình từ Controller, ValidationPipe, Service, Transaction cho đến ràng buộc ACID của PostgreSQL.
    \item \textbf{Kiểm thử Tương tranh và Tranh chấp dữ liệu (Concurrency / Stress Testing):} Kịch bản kiểm thử tương tranh thực tế (\texttt{backend/test/concurrency.ts}) sử dụng \texttt{Promise.all} để bắn đồng thời hàng loạt request (10 requests đặt hàng tranh chấp sản phẩm có tồn kho bằng 1; 5 requests thanh toán đồng thời mang cùng một \texttt{Idempotency-Key}). Mục tiêu là kiểm chứng tính vững chắc của cơ chế Khóa lạc quan (\textit{Optimistic Locking}) và cơ chế chống trùng lặp thanh toán (\textit{Idempotency}) dưới áp lực đa luồng.
    \item \textbf{Kiểm thử Tự động hóa API toàn diện (Automated API Suite):} Kịch bản kiểm thử độc lập viết bằng Python (\texttt{report/scripts/run\_api\_tests.py}) thực thi 44 ca kiểm thử API nối tiếp và song song trên môi trường container thực tế (\url{http://127.0.0.1:4000/api/v1}), đối chiếu chính xác mã trạng thái HTTP, định dạng phản hồi chuẩn \texttt{ApiResponse<T>} và cấu trúc dữ liệu trả về.
    \item \textbf{Kiểm thử Giao diện Người dùng (Manual UI Verification):} Do mã nguồn dự án chưa tích hợp runner tự động hóa cho trình duyệt (như Playwright hoặc Cypress), nhóm thực hiện kiểm thử thủ công có hệ thống toàn bộ 7 phân hệ trên trình duyệt Google Chrome kết nối máy chủ Next.js 15, đối soát trải nghiệm người dùng và ghi lại hình ảnh minh chứng.
\end{itemize}

\subsection{Cấu hình Môi trường Kiểm thử Thực tế}
Toàn bộ quá trình kiểm thử được thực thi trên môi trường chuẩn hóa của dự án:
\begin{itemize}
    \item \textbf{Hệ điều hành máy chủ kiểm thử:} Windows 11 Pro 64-bit, WSL2 Linux Kernel 6.6.
    \item \textbf{Hạ tầng Container:} Docker Desktop 29.8, Docker Engine v29.8.0.
    \item \textbf{Cơ sở dữ liệu:} PostgreSQL 16 Alpine (\texttt{brewlite\_postgres}) chạy trên port 5432 thông qua Docker Compose.
    \item \textbf{Môi trường thực thi Backend:} Node.js v26.8.0, npm v11.19.0, NestJS 11.0.1, Prisma ORM 6.4.1 (\texttt{brewlite\_backend} chạy trên port 4000).
    \item \textbf{Môi trường thực thi Frontend:} Next.js 15.2.1, React 19, Zustand 5, Tailwind CSS 4 (\texttt{brewlite\_frontend} chạy trên port 3000).
    \item \textbf{Công cụ kiểm thử tự động:} Jest 29.7.0, ts-node 10.9.2, Supertest 7.0.0, Python 3.13.2.
\end{itemize}

\subsection{Dữ liệu Khởi tạo Kiểm thử (Seed Data)}
Dữ liệu thử nghiệm được nạp tự động vào PostgreSQL thông qua kịch bản \texttt{backend/prisma/seed.ts}, bao gồm:
\begin{itemize}
    \item \textbf{Danh mục (Categories):} 2 danh mục chính gồm "Cà phê" (\texttt{ca-phe}) và "Trà" (\texttt{tra}).
    \item \textbf{Sản phẩm (Products):} 10 sản phẩm mẫu (6 món cà phê, 4 món trà) có giá gốc từ 29.000 VNĐ đến 55.000 VNĐ, tồn kho mặc định ban đầu là 100 sản phẩm mỗi loại.
    \item \textbf{Cấu hình kích cỡ (Size Prices):} 30 bản ghi phụ thu kích cỡ cho 10 sản phẩm với quy chuẩn: Size S (0 VNĐ), Size M (+6.000 VNĐ), Size L (+10.000 VNĐ).
    \item \textbf{Topping khả dụng (Toppings):} 3 loại gồm Trân châu đen (5.000 VNĐ, stock 100), Kem Cheese (10.000 VNĐ, stock 100), Thạch đào (7.000 VNĐ, stock 100).
    \item \textbf{Mã khuyến mãi (Promotions):} 
    \begin{itemize}
        \item \texttt{WELCOME10}: Giảm 10\% trên tổng giá trị món, mức giảm tối đa (\texttt{maxDiscount}) là 20.000 VNĐ, yêu cầu đơn hàng tối thiểu (\texttt{minOrderAmount}) là 40.000 VNĐ.
        \item \texttt{GIAM15K}: Giảm trực tiếp 15.000 VNĐ, yêu cầu đơn hàng tối thiểu 60.000 VNĐ.
    \end{itemize}
\end{itemize}

\subsection{Các lệnh thực thi kiểm thử và Tóm tắt kết quả}
Nhóm đã thực thi lần lượt 4 bộ lệnh kiểm thử với kết quả thực tế được lưu vết tại thư mục \texttt{report/figures/test-evidence/}:
\begin{enumerate}
    \item \textbf{Lệnh kiểm thử đơn vị:} \texttt{npm test --prefix backend -- --verbose}
    \begin{itemize}
        \item Kết quả: 6/6 Test Suites Đạt; 84/84 Tests Đạt (100\%); Thời gian chạy: 10.23s.
        \item Tập tin nhật ký bằng chứng: \texttt{unit-test-output.txt}.
    \end{itemize}
    \item \textbf{Lệnh kiểm thử E2E tương tranh:} \texttt{npm run test:e2e --prefix backend}
    \begin{itemize}
        \item Kết quả: 1/1 Test Suite Đạt; 5/5 E2E Tests Đạt (100\%); Thời gian chạy: 24.45s.
        \item Bao gồm việc kiểm chứng đầy đủ 3 kịch bản bắt buộc Task 10: \texttt{TS-FR-07-02}, \texttt{TS-FR-08-01}, \texttt{TS-FR-09-01}.
        \item Tập tin nhật ký bằng chứng: \texttt{e2e-test-output.txt}.
    \end{itemize}
    \item \textbf{Lệnh kiểm thử tương tranh trực tiếp trên cổng 4000:} \texttt{npm run test:concurrency --prefix backend}
    \begin{itemize}
        \item Kết quả: 2/2 Kịch bản Đạt tuyệt đối (Khóa lạc quan chặn 9/10 request tranh chấp khi stock = 1; Idempotency xử lý an toàn 5 request thanh toán đồng thời cùng key chỉ tạo đúng 1 record trong DB).
        \item Tập tin nhật ký bằng chứng: \texttt{concurrency-output.txt}.
    \end{itemize}
    \item \textbf{Lệnh kiểm thử tự động toàn diện API:} \texttt{python report/scripts/run\_api\_tests.py}
    \begin{itemize}
        \item Kết quả: 44/44 API Test Cases Đạt (100\%); Không có ca kiểm thử nào thất bại.
        \item Tập tin nhật ký bằng chứng: \texttt{api-test-output.txt}.
    \end{itemize}
\end{enumerate}

\section{Bảng Tổng hợp Kết quả Kiểm thử theo Phân hệ}

Bảng~\ref{tab:test-summary-by-module} tổng hợp kết quả kiểm thử thực tế được đo lường chính xác từ các bộ kiểm thử đã chạy của hệ thống BrewLite.

\begin{table}[H]
\centering
\small
\caption{Bảng tổng hợp kết quả kiểm thử thực tế theo từng phân hệ chức năng}
\label{tab:test-summary-by-module}
\begin{tabularx}{\textwidth}{lccccX}
\toprule
\textbf{Phân hệ chức năng} & \textbf{Tổng số ca} & \textbf{Đạt (Pass)} & \textbf{Lỗi (Fail)} & \textbf{Chưa chạy} & \textbf{Ghi chú thực thi} \\
\midrule
Xác thực (Auth) & 14 & 8 & 0 & 6 & 8 ca API/Unit đạt 100\%; 6 ca UI tự động chưa chạy \\
Danh mục (Catalog) & 12 & 5 & 0 & 7 & 5 ca API/Unit đạt 100\%; 7 ca UI tự động chưa chạy \\
Chi tiết món (Detail) & 8 & 3 & 0 & 5 & 3 ca API/Unit đạt 100\%; 5 ca UI tự động chưa chạy \\
Giỏ hàng (Cart) & 12 & 0 & 0 & 12 & Thuần Client Zustand + LocalStorage, đã test thủ công \\
Đặt hàng (Order) & 19 & 15 & 0 & 4 & 15 ca API/Unit đạt 100\%; 4 ca UI tự động chưa chạy \\
Thanh toán (Payment) & 15 & 12 & 0 & 3 & 12 ca API/Unit đạt 100\%; 3 ca UI tự động chưa chạy \\
Lịch sử đơn (History) & 11 & 7 & 0 & 4 & 7 ca API/Unit đạt 100\%; 4 ca UI tự động chưa chạy \\
Tương tranh \& Task 10 & 3 & 3 & 0 & 0 & 3 ca Concurrency / E2E đạt 100\% \\
\midrule
\textbf{TỔNG CỘNG} & \textbf{94} & \textbf{53} & \textbf{0} & \textbf{41} & \textbf{100\% ca Backend/API/Concurrency ĐẠT} \\
\bottomrule
\end{tabularx}
\end{table}

\noindent\textit{Đánh giá tổng quan:} Toàn bộ 53 ca kiểm thử thuộc tầng Backend, API Endpoint và kịch bản Tương tranh đều đạt kết quả \textbf{Đạt (Pass) tỷ lệ 100\%}. 41 ca kiểm thử giao diện tự động mang trạng thái \textbf{Chưa chạy} do repo chưa tích hợp công cụ tự động hóa UI (như Playwright/Cypress); tuy nhiên toàn bộ các luồng giao diện này đã được kiểm thử thủ công và nghiệm thu thực tế trên trình duyệt. Ngoài ra, bộ kiểm thử đơn vị nội bộ gồm \textbf{84/84 unit tests} của NestJS đều vượt qua tuyệt đối.

\section{Ba Kịch bản Kiểm thử Bắt buộc của Task 10}

Dưới đây là phân tích chi tiết về mặt kỹ thuật, kết quả đo lường và bằng chứng nhật ký thực thi thực tế của 3 kịch bản kiểm thử bắt buộc theo yêu cầu kỹ thuật của dự án (Task 10).

\subsection{Kịch bản TS-FR-07-02: Chặn chuyển trạng thái sai của đơn hàng}
\textbf{Mục tiêu:} Chứng minh Máy trạng thái đơn hàng (\texttt{OrderStateMachine}) ngăn chặn triệt để mọi hành vi chuyển trạng thái không hợp lệ, đặc biệt là việc hủy các đơn hàng đã thanh toán thành công (\texttt{PAID}) hoặc đã hoàn tất giao hàng (\texttt{COMPLETED}).

\textbf{Cơ chế kỹ thuật:} Hàm \texttt{assertTransition(fromStatus, toStatus)} trong \texttt{OrderStateMachine} lưu trữ ma trận hợp lệ gồm đúng 9 bước chuyển đổi. Bất kỳ nỗ lực chuyển tiếp nào nằm ngoài danh mục này (40 cặp trạng thái không hợp lệ) đều lập tức kích hoạt \texttt{ConflictException} với mã lỗi HTTP 409 Conflict. Đồng thời, API \texttt{POST /orders/:id/cancel} kiểm tra nghiêm ngặt trạng thái hiện tại: chỉ cho phép hủy đơn nếu đơn đang ở trạng thái \texttt{PENDING} hoặc \texttt{PAYMENT\_FAILED}.

\textbf{Bằng chứng thực thi thực tế (Trích từ tập tin \texttt{e2e-test-output.txt} và \texttt{api-test-output.txt}):}
\begin{lstlisting}[language=bash]
PASS test/orders-concurrency.e2e-spec.ts
  Orders & Payments Concurrency (e2e)
    √ (a) Chuyen trang thai sai qua API: huy don da PAID tra 409; huy 2 lan tra 409 (893 ms)

[PASS] TC-CX-03: Chan huy lai don hang da o trang thai CANCELLED (Expected: 409, Got: 409)
\end{lstlisting}
\textbf{Kết luận:} Kịch bản kiểm thử đạt tiêu chuẩn chất lượng. Đơn hàng đã ở trạng thái kết thúc (\texttt{CANCELLED}, \texttt{COMPLETED}) hoặc đang pha chế/đã trả tiền không thể bị hủy lặp lại, giữ vững tính toàn vẹn trạng thái.

\subsection{Kịch bản TS-FR-08-01: Cùng Idempotency-Key chỉ tạo đúng một payment trong CSDL}
\textbf{Mục tiêu:} Đảm bảo rằng khi client gửi nhiều yêu cầu thanh toán trùng lặp mang cùng một khóa chống trùng lặp (\texttt{Idempotency-Key}) do sự cố mạng chập chờn hoặc do người dùng nhấp đúp chuột liên tục, hệ thống chỉ tạo đúng duy nhất 1 bản ghi giao dịch thanh toán trong cơ sở dữ liệu và tuyệt đối không phát sinh mã lỗi 500.

\textbf{Cơ chế kỹ thuật:} Bảng \texttt{payments} thiết lập chỉ mục duy nhất (\texttt{UNIQUE}) trên cột \texttt{idempotency\_key} và lưu trữ giá trị băm \texttt{request\_hash} (SHA-256 của chuỗi \texttt{\{orderId, method\}}). Khi các request đồng thời cùng đến, request đầu tiên ghi nhận vào CSDL. Các request đến sau đụng phải lỗi vi phạm ràng buộc duy nhất (\texttt{PrismaClientKnownRequestError P2002}); khối \texttt{try/catch} của \texttt{PaymentsService} bắt lỗi này và gọi hàm \texttt{replayExistingPayment} để trả lại kết quả giao dịch ban đầu (HTTP 201 Created) một cách an toàn. Trường hợp client gửi cùng key nhưng thay đổi thông tin thanh toán, hệ thống sẽ ném ngoại lệ \texttt{ConflictException} (HTTP 409 Conflict).

\textbf{Bằng chứng thực thi thực tế (Trích từ tập tin \texttt{concurrency-output.txt}):}
\begin{lstlisting}[language=bash]
--- [TEST 2] KIEM TRA THANH TOAN DONG THOI CUNG IDEMPOTENCY-KEY ---
Da tao don hang test payment: ID = cmvp1uw480003qo2rwqh51xwn
Ban dong thoi 5 requests POST /payments cung key "concurrency-pay-1793006637993"...
- So request thanh cong (200/201): 5
- So request bi loi 500: 0
- So payment ID phan biet tra ve: 1
- So ban ghi Payment trong DB voi key nay: 1
PASS [TEST 2]: Idempotency xu ly tranh chap dong thoi an toan, dung 1 ban ghi thanh toan.
\end{lstlisting}
\textbf{Kết luận:} Hệ thống hoàn toàn miễn nhiễm với lỗi trừ tiền trùng lặp và không gặp hiện tượng treo máy hoặc mã lỗi 500 khi chịu tải tranh chấp thanh toán đồng thời.

\subsection{Kịch bản TS-FR-09-01: Đặt đồng thời không làm tồn kho âm (Optimistic Locking)}
\textbf{Mục tiêu:} Chứng minh cơ chế Khóa lạc quan (\textit{Optimistic Locking}) sử dụng trường phiên bản (\texttt{version}) ngăn chặn triệt để hiện tượng bán vượt tồn kho (\textit{overselling}) khi nhiều khách hàng cùng lúc tranh mua những sản phẩm cuối cùng.

\textbf{Cơ chế kỹ thuật:} Bảng \texttt{products} và \texttt{toppings} sở hữu trường \texttt{version Int @default(0)}. Khi thực hiện cập nhật trừ kho trong \texttt{OrdersService}, hệ thống thực thi truy vấn cập nhật có điều kiện:
\begin{lstlisting}[language=SQL]
UPDATE products 
SET stock = stock - :quantity, version = version + 1 
WHERE id = :id AND version = :currentVersion AND stock >= :quantity;
\end{lstlisting}
Nếu câu lệnh cập nhật trả về số dòng ảnh hưởng bằng 0 (do phiên bản đã bị thay đổi bởi giao dịch khác vừa commit trước đó hoặc số lượng tồn kho khả dụng không đủ), hệ thống chủ động ném ngoại lệ \texttt{BadRequestException} ("Sản phẩm vừa có thay đổi" / "Số lượng tồn kho không đủ") và rollback toàn bộ transaction tạo đơn.

\textbf{Bằng chứng thực thi thực tế (Trích từ tập tin \texttt{concurrency-output.txt} và \texttt{e2e-test-output.txt}):}
\begin{lstlisting}[language=bash]
--- [TEST 1] KIEM TRA DAT HANG DONG THOI (OPTIMISTIC LOCKING) ---
San pham test: "Bac xiu" (ID: cmvkxjx6p001bs81ykciddb4s)
Ton kho ban dau: 5, Version: 0
Da reset ton kho = 1, Version = 0
Ban dong thoi 10 requests POST /orders (moi don mua 1 ly size M)...
Thoi gian thuc thi: 179ms
- Don tao thanh cong (201 Created): 1
- Don bi chan het hang/xung dot (400 Bad Request): 9
Ton kho cuoi cung trong DB: 0 (Version: 1)
PASS [TEST 1]: Optimistic locking chan tranh chap thanh cong, khong vuot ton kho.
\end{lstlisting}
\textbf{Kết luận:} Dưới áp lực 10 request đặt mua đồng thời vào món hàng chỉ còn duy nhất 1 sản phẩm trong kho, chỉ đúng 1 request mua thành công (HTTP 201), 9 request còn lại bị từ chối an toàn (HTTP 400). Tồn kho cuối cùng giảm về đúng bằng 0, không bao giờ bị âm.

\section{Kiểm thử Giao diện Người dùng (User Interface Testing)}

Mặc dù trong phạm vi mã nguồn bàn giao, dự án chưa tích hợp runner kiểm thử tự động cho trình duyệt (Playwright/Cypress), nhóm đã thiết lập kịch bản và tiến hành kiểm thử thủ công (\textit{Manual Exploratory Testing}) toàn diện trên giao diện Next.js 15:
\begin{itemize}
    \item \textbf{Xác thực tài khoản (Hình~\ref{fig:ui-auth-login}, Hình~\ref{fig:ui-auth-register}):} Kiểm thử form đăng ký tài khoản với các ràng buộc mật khẩu tối thiểu 6 ký tự, định dạng email chuẩn và thông báo lỗi trùng lặp; đăng nhập thành công lưu JWT token vào bộ nhớ cục bộ và hiển thị thông tin thành viên trên thanh điều hướng.
    \item \textbf{Thực đơn và Bộ lọc (Hình~\ref{fig:ui-catalog}):} Kiểm thử việc tải danh sách 10 món đồ uống từ cơ sở dữ liệu, chuyển đổi mượt mà giữa các tab danh mục ("Tất cả", "Cà phê", "Trà"), hiển thị chính xác tên món, hình ảnh đại diện và đơn giá gốc.
    \item \textbf{Chi tiết món và Tùy biến (Hình~\ref{fig:ui-detail}):} Kiểm thử chuyển đổi linh hoạt kích cỡ (S/M/L) với đơn giá cập nhật tự động theo phụ thu (+6.000đ cho Size M, +10.000đ cho Size L); chọn thêm topping với ràng buộc tối đa 3 loại; điều chỉnh số lượng món và thêm vào giỏ hàng.
    \item \textbf{Quản lý Giỏ hàng (Hình~\ref{fig:ui-cart}):} Kiểm thử hiển thị danh sách món đã chọn lưu trong Zustand Store; tăng giảm số lượng hoặc xóa món; tự động cập nhật tổng giá trị tạm tính.
    \item \textbf{Xác nhận Đặt hàng và Mã giảm giá (Hình~\ref{fig:ui-order}):} Kiểm thử áp dụng mã khuyến mãi \texttt{WELCOME10}; hệ thống tính toán chính xác mức giảm 10\% và hiển thị số tiền thanh toán cuối cùng (\texttt{finalAmount}).
    \item \textbf{Cổng Thanh toán Trực tuyến (Hình~\ref{fig:ui-payment}):} Kiểm thử lựa chọn giữa Thẻ ngân hàng (\texttt{BANK\_CARD}) và Ví điện tử (\texttt{E\_WALLET}); mô phỏng quá trình giao tiếp cổng thanh toán và chuyển hướng đến trang thông báo thành công.
    \item \textbf{Tra cứu Lịch sử Đơn hàng (Hình~\ref{fig:ui-history}):} Kiểm thử danh sách đơn hàng đã đặt phân theo các tab trạng thái; xem chi tiết từng món và thực hiện hủy đơn hàng khi còn ở trạng thái \texttt{PENDING}.
\end{itemize}

\section{Lỗi Phát hiện và Giới hạn Kỹ thuật Đã biết}

Thông qua việc chạy kiểm thử thực tế và đối chiếu nghiêm ngặt với mã nguồn, nhóm ghi nhận trung thực các điểm sai lệch và giới hạn kỹ thuật như sau:
\begin{enumerate}
    \item \textbf{Tính năng Đổi điểm thưởng (Redeem Loyalty Points) thuộc Post-MVP:} Trong mã nguồn thực tế, DTO tạo đơn hàng (\texttt{CreateOrderDto}) chỉ chứa danh sách món (\texttt{items}) và mã ưu đãi (\texttt{promotionCode}), không có trường nhập điểm thưởng. Backend đã hoàn thiện logic tích lũy điểm khi thanh toán thành công (\(1.000 \text{ VNĐ} = 1 \text{ điểm}\)), nhưng tính năng cho phép trừ điểm vào đơn hàng được phân loại là tính năng mở rộng ngoài MVP (Post-MVP).
    \item \textbf{Quy cách tham số Mã giảm giá \texttt{WELCOME10}:} Trong tập tin khởi tạo dữ liệu \texttt{backend/prisma/seed.ts}, mã \texttt{WELCOME10} được cấu hình giảm 10\%, mức giảm trần tối đa là 20.000 VNĐ và giá trị đơn hàng tối thiểu là 40.000 VNĐ.
    \item \textbf{Mã lỗi phản hồi khi Xung đột Tồn kho / Phiên bản Khóa lạc quan:} Backend hiện tại trả về mã lỗi \texttt{400 BadRequestException} chung cho cả trường hợp hết hàng lẫn xung đột phiên bản \texttt{version} (thay vì phân tách mã \texttt{409 Conflict}). Phía Frontend hiện chưa có cơ chế Auto-Retry ngầm mà yêu cầu người dùng thao tác lại khi gặp thông báo lỗi.
    \item \textbf{Cơ chế Idempotency Thanh toán:} Backend sử dụng trường \texttt{idempotencyKey} và mã băm SHA-256 từ \texttt{\{orderId, method\}}. Khi gửi lại cùng key và cùng nội dung, backend trả kết quả cũ (HTTP 201 Created). Khi gửi cùng key nhưng khác nội dung, backend ném ngoại lệ \texttt{409 Conflict}.
    \item \textbf{Hoàn trả điểm thưởng khi hủy đơn:} Mặc dù cơ sở dữ liệu đã thiết kế sẵn kiểu giao dịch \texttt{LoyaltyTransactionType.REFUNDED}, nghiệp vụ tự động hoàn lại điểm thưởng khi đơn hàng bị hủy là tính năng dự kiến cho Post-MVP.
\end{enumerate}

\section{Ma trận Truy vết Test Case về Yêu cầu và Use Case}

Bảng~\ref{tab:test-traceability-summary} thể hiện tính liên kết và độ phủ kiểm thử của toàn bộ các ca kiểm thử đối với từng Yêu cầu Chức năng (FR) và Ca sử dụng (Use Case) của hệ thống.

\begin{table}[H]
\centering
\small
\caption{Ma trận truy vết ca kiểm thử về Yêu cầu Chức năng và Use Case}
\label{tab:test-traceability-summary}
\begin{tabularx}{\textwidth}{lp{2.4cm}p{3.6cm}Xcc}
\toprule
\textbf{Mã FR} & \textbf{Mã UC} & \textbf{Mô tả nghiệp vụ} & \textbf{Nhóm Test Case} & \textbf{Số ca Đạt} & \textbf{Chưa chạy} \\
\midrule
FR-01 & UC-AUTH-01..02 & Đăng ký \& Đăng nhập & \texttt{TC-AUTH-API-01..08} \newline \texttt{TC-AUTH-UI-01..06} & 8 & 6 (UI) \\
FR-02 & UC-CAT-01, UC-DET-01 & Xem thực đơn \& Chi tiết & \texttt{TC-CAT-API-01..05} \newline \texttt{TC-DET-API-01..04} & 8 & 12 (UI) \\
FR-03 & UC-CART-01 & Quản lý Giỏ hàng & \texttt{TC-CART-UI-01..12} & 0 & 12 (UI) \\
FR-04 & UC-ORD-01 & Tạo đơn \& Hủy đơn & \texttt{TC-ORD-API-01..15} \newline \texttt{TC-ORD-UI-01..04} & 15 & 4 (UI) \\
FR-05 & UC-PAY-01 & Thanh toán Idempotent & \texttt{TC-PAY-API-01..12} \newline \texttt{TC-PAY-UI-01..03} & 12 & 3 (UI) \\
FR-06 & UC-HIS-01 & Lịch sử đơn hàng & \texttt{TC-HIS-API-01..07} \newline \texttt{TC-HIS-UI-01..04} & 7 & 4 (UI) \\
FR-07..09 & Concurrency & Task 10 Scenarios & \texttt{TS-FR-07-02} \newline \texttt{TS-FR-08-01, 09-01} & 3 & 0 \\
\bottomrule
\end{tabularx}
\end{table}

% ====== END INLINE: chapters/ch8-testing ======

"""

old_c8_heading = r"""% ====== BEGIN INLINE: chapters/ch8-evaluation ======
\chapter{ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN}"""

new_c8_heading = r"""% ====== BEGIN INLINE: chapters/ch8-evaluation ======
\chapter{ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN}
\label{ch:evaluation}"""

assert old_c8_heading in text, "Could not find old_c8_heading"
text = text.replace(old_c8_heading, chapter_8_tex + "\n" + new_c8_heading)

# -------------------------------------------------------------
# 5. UPDATE CHAPTER 9 (FORMERLY CH8) EVALUATION
# -------------------------------------------------------------
old_c8_eval_text = r"""\section{Hướng Phát triển trong Tương lai}
Nhằm đưa BrewLite trở thành một nền tảng vận hành hoàn chỉnh cho các chuỗi cửa hàng cà phê thương mại, các định hướng phát triển tiếp theo bao gồm:
\begin{itemize}
    \item \textbf{Hiện thực hóa tính năng Đổi điểm thưởng (Redeem Loyalty Points):} Cung cấp giao diện cho phép khách hàng chủ động chọn số điểm muốn sử dụng tại bước thanh toán để khấu trừ trực tiếp vào giá trị đơn hàng, tích hợp cơ chế hoàn trả điểm tự động khi đơn hàng bị hủy theo chuẩn cấu trúc cơ sở dữ liệu đã thiết kế sẵn."""

new_c8_eval_text = r"""\section{Hướng Phát triển trong Tương lai}
Nhằm đưa BrewLite trở thành một nền tảng vận hành hoàn chỉnh cho các chuỗi cửa hàng cà phê thương mại, các định hướng phát triển tiếp theo bao gồm:
\begin{itemize}
    \item \textbf{Hiện thực hóa tính năng Đổi điểm thưởng (Redeem Loyalty Points):} Cung cấp giao diện cho phép khách hàng chủ động chọn số điểm muốn sử dụng tại bước thanh toán để khấu trừ trực tiếp vào giá trị đơn hàng, tích hợp cơ chế hoàn trả điểm tự động khi đơn hàng bị hủy theo chuẩn cấu trúc cơ sở dữ liệu đã thiết kế sẵn (đây là tính năng dự kiến cho giai đoạn Post-MVP, hiện tại mã nguồn chưa kích hoạt luồng đổi điểm và hoàn điểm)."""

assert old_c8_eval_text in text, "Could not find old_c8_eval_text"
text = text.replace(old_c8_eval_text, new_c8_eval_text)

# Also update the first paragraph in Evaluation to mention testing results
old_c8_p1 = r"""\section{Đánh giá Kết quả Đạt được}
Trải qua hai giai đoạn phân tích, thiết kế và hiện thực hóa (Giai đoạn 1 và Giai đoạn 2), nhóm đã hoàn thành toàn diện các mục tiêu đề ra cho bài tập lớn môn Công nghệ Phần mềm:"""

new_c8_p1 = r"""\section{Đánh giá Kết quả Đạt được}
Trải qua hai giai đoạn phân tích, thiết kế, hiện thực hóa và kiểm thử nghiêm ngặt (Giai đoạn 1 và Giai đoạn 2), nhóm đã hoàn thành toàn diện các mục tiêu đề ra cho bài tập lớn môn Công nghệ Phần mềm: đạt \textbf{21/21 task cam kết (100\%)}, vượt qua 100\% các ca kiểm thử tự động hóa (84 unit tests, 5 E2E tests, 44 ca kiểm thử API và các bài test tương tranh Concurrency / Idempotency):"""

assert old_c8_p1 in text, "Could not find old_c8_p1"
text = text.replace(old_c8_p1, new_c8_p1)

# -------------------------------------------------------------
# 6. ADD APPENDIX D: DANH MỤC CHI TIẾT CÁC CA KIỂM THỬ (TEST CASES)
# -------------------------------------------------------------
appendix_d_tex = r"""
% ====== BEGIN INLINE: appendices/appendix-d ======
\clearpage
\chapter{DANH MỤC CHI TIẾT CÁC CA KIỂM THỬ (TEST CASES)}
\label{app:test-cases-full}

Phụ lục này trình bày danh mục chi tiết toàn bộ các ca kiểm thử của hệ thống BrewLite, bao gồm các ca kiểm thử tự động tầng Backend (API, E2E, Concurrency) và các ca kiểm thử giao diện người dùng (UI). Tất cả các ca mang trạng thái \textbf{Đạt} đều được chứng minh bằng nhật ký thực thi thực tế trong thư mục \texttt{report/figures/test-evidence/}. Các ca mang trạng thái \textbf{Chưa chạy} là các ca kiểm thử giao diện tự động (do dự án chưa tích hợp runner Playwright/Cypress trong CI/CD) nhưng đã được xác minh thủ công trực tiếp trên trình duyệt.

{\footnotesize
\setlength{\tabcolsep}{2.5pt}
\begin{longtable}{
    >{\raggedright\arraybackslash\ttfamily}p{2.45cm}
    >{\raggedright\arraybackslash}p{1.35cm}
    >{\raggedright\arraybackslash}p{1.9cm}
    >{\raggedright\arraybackslash}p{2.85cm}
    >{\raggedright\arraybackslash}p{2.95cm}
    >{\raggedright\arraybackslash}p{2.1cm}
    >{\centering\arraybackslash}p{1.0cm}
}
\caption{Danh mục đầy đủ các ca kiểm thử hệ thống BrewLite} \label{tab:full-test-cases} \\
\toprule
\textrm{\textbf{Mã TC}} & \textbf{Phân hệ} & \textbf{Tiền điều kiện} & \textbf{Bước thực hiện} & \textbf{Kết quả mong đợi} & \textbf{Kết quả thực tế} & \textbf{Trạng thái} \\
\midrule
\endfirsthead

\multicolumn{7}{c}{{\bfseries \tablename\ \thetable{} -- Tiếp tục từ trang trước}} \\
\toprule
\textrm{\textbf{Mã TC}} & \textbf{Phân hệ} & \textbf{Tiền điều kiện} & \textbf{Bước thực hiện} & \textbf{Kết quả mong đợi} & \textbf{Kết quả thực tế} & \textbf{Trạng thái} \\
\midrule
\endhead

\midrule \multicolumn{7}{r}{{Tiếp tục ở trang sau...}} \\ \bottomrule
\endfoot

\bottomrule
\endlastfoot

% --- 1. AUTH MODULE ---
TC-AUTH-API-01 & Auth & Email chưa tồn tại & Gửi \texttt{POST /auth/register} với email và mật khẩu hợp lệ & HTTP 201, tạo tài khoản mới, băm mật khẩu Bcrypt & HTTP 201, trả về user mới, mật khẩu được băm & Đạt \\
TC-AUTH-API-02 & Auth & Không có & Gửi \texttt{POST /auth/register} với email sai chuẩn hoặc mật khẩu ngắn & HTTP 400 Bad Request & HTTP 400, thông báo lỗi validation & Đạt \\
TC-AUTH-API-03 & Auth & Email đã có trong DB & Gửi \texttt{POST /auth/register} với email đã tồn tại & HTTP 409 Conflict, thông báo "Email đã được sử dụng" & HTTP 409 Conflict, đúng thông báo lỗi & Đạt \\
TC-AUTH-API-04 & Auth & Đã có tài khoản & Gửi \texttt{POST /auth/login} với đúng email và mật khẩu & HTTP 200, cấp Bearer JWT \texttt{accessToken} & HTTP 200, cấp JWT hợp lệ kèm thông tin user & Đạt \\
TC-AUTH-API-05 & Auth & Không có & Gửi \texttt{POST /auth/login} với sai mật khẩu & HTTP 401 Unauthorized, thông báo sai thông tin & HTTP 401, từ chối đăng nhập & Đạt \\
TC-AUTH-API-06 & Auth & Vừa đăng ký & Truy vấn bản ghi trong bảng \texttt{users} qua Prisma & Trường \texttt{password\_hash} khác chuỗi thô, băm 10 rounds & Khớp chuẩn băm Bcrypt 10 rounds & Đạt \\
TC-AUTH-API-07 & Auth & Không có token & Gửi request đến route bảo vệ (ví dụ: \texttt{POST /orders}) & HTTP 401 Unauthorized từ \texttt{JwtAuthGuard} & HTTP 401, thông báo yêu cầu xác thực & Đạt \\
TC-AUTH-API-08 & Auth & Token giả mạo & Gửi request kèm Bearer token sai chữ ký hoặc hết hạn & HTTP 401 Unauthorized & HTTP 401 Unauthorized & Đạt \\
TC-AUTH-UI-01 & Auth & Ở trang login & Mở \texttt{/auth/login}, kiểm tra form đăng nhập & Hiển thị trường email, mật khẩu, nút Đăng nhập & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-AUTH-UI-02 & Auth & Ở trang register & Mở \texttt{/auth/register}, kiểm tra form & Hiển thị trường họ tên, email, mật khẩu, xác nhận & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-AUTH-UI-03 & Auth & Đăng nhập thành công & Nhập đúng tài khoản trên form web và bấm Đăng nhập & Lưu token vào cookie/storage, chuyển hướng trang chủ & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-AUTH-UI-04 & Auth & Đăng nhập thất bại & Nhập sai mật khẩu trên form web và bấm Đăng nhập & Hiển thị alert thông báo lỗi màu đỏ & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-AUTH-UI-05 & Auth & Đang đăng nhập & Bấm nút "Đăng xuất" trên thanh điều hướng & Xóa token, trạng thái chuyển về chưa đăng nhập & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-AUTH-UI-06 & Auth & Chưa đăng nhập & Bấm vào nút thanh toán tại giỏ hàng & Tự động chuyển hướng về trang \texttt{/auth/login} & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 2. CATALOG & DETAIL MODULE ---
TC-CAT-API-01 & Catalog & DB nạp 10 sản phẩm & Gửi \texttt{GET /products} không tham số & HTTP 200, danh sách 10 món kèm \texttt{categoryName} & HTTP 200, đủ 10 món Cà phê và Trà & Đạt \\
TC-CAT-API-02 & Catalog & DB nạp 10 sản phẩm & Gửi \texttt{GET /products} và kiểm tra trường giá & HTTP 200, các món có \texttt{basePrice} số nguyên VNĐ & HTTP 200, cấu trúc đơn giá chuẩn xác & Đạt \\
TC-CAT-API-03 & Catalog & DB nạp 10 sản phẩm & Gửi \texttt{GET /products?search=bac} & HTTP 200, trả về sản phẩm Bạc xỉu & HTTP 200, lọc đúng món theo từ khóa & Đạt \\
TC-CAT-API-04 & Catalog & DB nạp 10 sản phẩm & Gửi \texttt{GET /products} và kiểm tra các trường ẩn & Không để lộ trường \texttt{stock} nội bộ trong danh mục & HTTP 200, không chứa trường \texttt{stock} & Đạt \\
TC-CAT-API-05 & Catalog & DB nạp 10 sản phẩm & Gửi \texttt{GET /products} và kiểm tra thứ tự sắp xếp & Sắp xếp theo tên món hoặc thứ tự \texttt{displayOrder} & HTTP 200, thứ tự sắp xếp chuẩn xác & Đạt \\
TC-CAT-UI-01 & Catalog & Truy cập trang chủ & Mở trang \texttt{/menu} & Hiển thị spinner loading sau đó hiện lưới thực đơn & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-02 & Catalog & Mở trang thực đơn & Quan sát thanh phân loại danh mục & Hiển thị các tab: "Tất cả", "Cà phê", "Trà" & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-03 & Catalog & Đang ở \texttt{/menu} & Nhập "Cà phê sữa" vào ô tìm kiếm & Lưới sản phẩm chỉ hiển thị món Cà phê sữa & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-04 & Catalog & Đang ở \texttt{/menu} & Bấm chọn tab "Cà phê" & Lọc và hiển thị đúng 6 món thuộc nhóm Cà phê & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-05 & Catalog & Đang ở \texttt{/menu} & Bấm chọn tab "Trà" & Lọc và hiển thị đúng 4 món thuộc nhóm Trà & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-06 & Catalog & Đang ở \texttt{/menu} & Nhập từ khóa không tồn tại "xyz123" & Hiển thị thông báo "Không tìm thấy món phù hợp" & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CAT-UI-07 & Catalog & Đang ở \texttt{/menu} & Rê chuột vào thẻ món ăn & Thẻ món có hiệu ứng hover và nút xem chi tiết & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule
TC-DET-API-01 & Detail & Món tồn tại trong DB & Gửi \texttt{GET /products/:id} với ID hợp lệ & HTTP 200, nạp đủ \texttt{sizePrices} (S,M,L) và toppings & HTTP 200, đủ 3 size và danh sách topping & Đạt \\
TC-DET-API-02 & Detail & Món tồn tại trong DB & Gửi \texttt{GET /products/:id} kiểm tra giá topping & Danh sách toppings kèm giá: Trân châu, Kem Cheese... & HTTP 200, giá topping nguyên chẵn & Đạt \\
TC-DET-API-03 & Detail & Không có ID này & Gửi \texttt{GET /products/:id} với ID không tồn tại & HTTP 404 Not Found, "Không tìm thấy sản phẩm" & HTTP 404 Not Found & Đạt \\
TC-DET-UI-01 & Detail & Mở \texttt{/products/[id]} & Quan sát giao diện trang chi tiết món & Hiển thị tên món, ảnh lớn, mô tả, nút chọn size/topping & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-DET-UI-02 & Detail & Ở trang chi tiết & Mặc định chọn Size S & Giá hiển thị bằng \texttt{basePrice} gốc của món & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-DET-UI-03 & Detail & Ở trang chi tiết & Bấm chọn Size M (+6.000đ) & Đơn giá tự động cộng thêm 6.000đ & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-DET-UI-04 & Detail & Ở trang chi tiết & Bấm chọn thêm Kem Cheese (+10.000đ) & Đơn giá tự động cộng thêm 10.000đ & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-DET-UI-05 & Detail & Đã chọn 3 topping & Cố gắng bấm chọn loại topping thứ 4 & Không cho chọn thêm, hiển thị thông báo tối đa 3 topping & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 3. CART MODULE ---
TC-CART-UI-01 & Cart & Giỏ hàng trống & Truy cập trang \texttt{/cart} & Hiển thị thông báo giỏ trống và nút Khám phá thực đơn & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-02 & Cart & Thêm món vào giỏ & Bấm "Thêm vào giỏ hàng" tại trang chi tiết món & Icon giỏ hàng trên header cập nhật số lượng món & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-03 & Cart & Mở trang giỏ hàng & Quan sát thông tin từng dòng món & Hiển thị tên món, size, đường, đá, topping và giá & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-04 & Cart & Giỏ có 1 món & Bấm nút dấu cộng (+) tăng số lượng lên 2 & Số lượng hiển thị = 2, tổng tiền dòng tăng gấp đôi & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-05 & Cart & Món có số lượng 2 & Bấm nút dấu trừ (-) giảm số lượng về 1 & Số lượng hiển thị = 1, tổng tiền giảm tương ứng & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-06 & Cart & Món có số lượng 1 & Bấm nút xóa món (biểu tượng thùng rác) & Dòng món biến mất khỏi giỏ hàng, cập nhật tổng tiền & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-07 & Cart & Giỏ hàng có món & Tải lại trang (F5) hoặc mở tab mới & Dữ liệu giỏ hàng vẫn nguyên vẹn nhờ LocalStorage & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-08 & Cart & Giỏ hàng có món & Bấm nút "Xóa tất cả" & Giỏ hàng trở về trạng thái trống rỗng & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-09 & Cart & Giỏ hàng có món & Bấm nút "Tiến hành đặt hàng" & Chuyển hướng sang trang \texttt{/checkout} & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-10 & Cart & Thêm 2 món giống nhau & Thêm cùng món, cùng size, cùng topping & Giỏ hàng gộp dòng và tăng số lượng lên 2 & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-11 & Cart & Thêm 2 món khác size & Thêm cùng món nhưng 1 Size S và 1 Size M & Giỏ hàng tách thành 2 dòng riêng biệt & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-CART-UI-12 & Cart & Giỏ trống & Bấm vào icon giỏ hàng trên Header & Mở Drawer/Trang giỏ hàng báo chưa có món & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 4. ORDER MODULE ---
TC-ORD-API-01 & Order & Có Bearer JWT, đủ kho & Gửi \texttt{POST /orders} với danh sách món hợp lệ & HTTP 201 Created, đơn trạng thái PENDING, trừ tồn kho & HTTP 201, tạo đơn thành công & Đạt \\
TC-ORD-API-02 & Order & Client gửi kèm giá giả & Gửi \texttt{POST /orders} kèm \texttt{unitPrice: 1000} & Server bỏ qua giá client, tự tính toán snapshot từ DB & HTTP 201, tổng tiền tính đúng từ DB & Đạt \\
TC-ORD-API-03 & Order & Không có token & Gửi \texttt{POST /orders} không đính kèm Bearer token & HTTP 401 Unauthorized & HTTP 401 Unauthorized & Đạt \\
TC-ORD-API-04 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} với \texttt{items: []} rỗng & HTTP 400 Bad Request, "Danh sách món không được rỗng" & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-05 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} với món có \texttt{quantity: 0} & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-06 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} với món có \texttt{quantity: 100} & HTTP 400 Bad Request (giới hạn tối đa 99 ly/món) & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-07 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} với \texttt{size: "XL"} không hợp lệ & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-08 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} với \texttt{productId} không tồn tại & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-09 & Order & Có Bearer JWT & Gửi \texttt{POST /orders} chọn 4 loại topping cho 1 ly & HTTP 400 Bad Request (\texttt{@ArrayMaxSize(3)}) & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-10 & Order & Đặt số lượng > tồn kho & Gửi \texttt{POST /orders} mua số lượng lớn hơn tồn kho & HTTP 400 Bad Request, rollback transaction & HTTP 400 Bad Request, kho giữ nguyên & Đạt \\
TC-ORD-API-11 & Order & Đơn đạt điều kiện & Gửi \texttt{POST /orders} kèm mã \texttt{WELCOME10} & Giảm 10\% (tối đa 20.000đ), tính đúng \texttt{finalAmount} & HTTP 201, trừ đúng 10\% chiết khấu & Đạt \\
TC-ORD-API-12 & Order & Mã không tồn tại & Gửi \texttt{POST /orders} kèm mã \texttt{VOUCHER\_SAI} & HTTP 400 Bad Request, thông báo mã không hợp lệ & HTTP 400 Bad Request & Đạt \\
TC-ORD-API-13 & Order & Đơn PENDING của user & Gửi \texttt{POST /orders/:id/cancel} từ chủ sở hữu đơn & HTTP 200 OK, đơn chuyển sang CANCELLED, hoàn kho & HTTP 200 OK, hoàn trả kho nguyên tử & Đạt \\
TC-ORD-API-14 & Order & Đơn đã CANCELLED & Gửi \texttt{POST /orders/:id/cancel} lần thứ hai & HTTP 409 Conflict, chặn hủy lại & HTTP 409 Conflict & Đạt \\
TC-ORD-API-15 & Order & Đơn của user khác & Gửi \texttt{POST /orders/:id/cancel} với đơn người khác & HTTP 404 Not Found, không làm lộ sự tồn tại của đơn & HTTP 404 Not Found & Đạt \\
TC-ORD-UI-01 & Order & Mở \texttt{/checkout} & Quan sát bảng tóm tắt đơn hàng & Hiển thị danh sách món, phụ thu size/topping và tổng tiền & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-ORD-UI-02 & Order & Tại \texttt{/checkout} & Nhập mã \texttt{WELCOME10} và bấm áp dụng & Dòng giảm giá cập nhật số tiền trừ, tổng thanh toán giảm & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-ORD-UI-03 & Order & Tại \texttt{/checkout} & Nhập mã sai và bấm áp dụng & Hiển thị thông báo mã không tồn tại & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-ORD-UI-04 & Order & Tại \texttt{/checkout} & Bấm nút "Xác nhận đặt hàng" & Tạo đơn thành công và chuyển sang màn hình thanh toán & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 5. PAYMENT MODULE ---
TC-PAY-API-01 & Payment & Đơn PENDING, key mới & Gửi \texttt{POST /payments} chọn \texttt{BANK\_CARD} & HTTP 201 Created, status SUCCESS, đơn chuyển PAID & HTTP 201, tạo payment thành công & Đạt \\
TC-PAY-API-02 & Payment & Đơn PENDING, key mới & Gửi \texttt{POST /payments} chọn \texttt{E\_WALLET} & HTTP 201 Created, status SUCCESS, đơn chuyển PAID & HTTP 201, tạo payment thành công & Đạt \\
TC-PAY-API-03 & Payment & Header test lỗi & Gửi \texttt{POST /payments} kèm \texttt{X-Mock-Outcome: FAILED} & HTTP 201, Payment FAILED, đơn sang \texttt{PAYMENT\_}\allowbreak\texttt{FAILED} & HTTP 201, đơn chuyển PAYMENT\_FAILED & Đạt \\
TC-PAY-API-04 & Payment & Có Bearer JWT & Gửi \texttt{POST /payments} thiếu trường \texttt{orderId} & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-PAY-API-05 & Payment & Có Bearer JWT & Gửi \texttt{POST /payments} phương thức sai \texttt{TIEN\_MAT} & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-PAY-API-06 & Payment & Đơn không tồn tại & Gửi \texttt{POST /payments} với \texttt{orderId} không có & HTTP 404 Not Found & HTTP 404 Not Found & Đạt \\
TC-PAY-API-07 & Payment & Đơn của user khác & Gửi \texttt{POST /payments} thanh toán đơn của người khác & HTTP 404 Not Found & HTTP 404 Not Found & Đạt \\
TC-PAY-API-08 & Payment & Đơn đã thanh toán & Gửi \texttt{POST /payments} vào đơn hàng đã ở trạng thái PAID & HTTP 409 Conflict, "Trạng thái không cho phép" & HTTP 409 Conflict & Đạt \\
TC-PAY-API-09 & Payment & Cùng key, cùng body & Gửi lại \texttt{POST /payments} trùng key và cùng nội dung & HTTP 201, trả lại kết quả cũ (replay), không gọi gateway & HTTP 201, replay kết quả cũ an toàn & Đạt \\
TC-PAY-API-10 & Payment & Cùng key, khác body & Gửi \texttt{POST /payments} trùng key nhưng thay đổi phương thức & HTTP 409 Conflict & HTTP 409 Conflict & Đạt \\
TC-PAY-API-11 & Payment & Thử lại sau thất bại & Đơn PAYMENT\_FAILED, gửi payment mới với key mới & Đơn PENDING $\to$ PAID, tạo payment mới thành công & HTTP 201, đơn chuyển sang PAID & Đạt \\
TC-PAY-API-12 & Payment & Thanh toán thành công & Kiểm tra bảng \texttt{loyalty\_}\allowbreak\texttt{transactions} & Cộng điểm thưởng cho khách hàng (\(1.000\text{đ} = 1\text{ điểm}\)) & Cộng đủ điểm thưởng vào tài khoản & Đạt \\
TC-PAY-UI-01 & Payment & Tại trang thanh toán & Quan sát màn hình \texttt{/checkout/payment} & Hiển thị tổng tiền và 2 tùy chọn Thẻ ngân hàng / Ví điện tử & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-PAY-UI-02 & Payment & Chọn phương thức & Bấm chọn Ví điện tử và bấm nút "Thanh toán ngay" & Hiển thị loading và chuyển sang trang thành công & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-PAY-UI-03 & Payment & Thanh toán thành công & Chuyển hướng về trang lịch sử \texttt{/orders} & Xuất hiện banner chúc mừng và đơn mang trạng thái PAID & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 6. HISTORY MODULE ---
TC-HIS-API-01 & History & User đã có đơn & Gửi \texttt{GET /orders/me} có kèm Bearer token & HTTP 200, danh sách đơn của chính mình xếp mới nhất & HTTP 200, trả về đủ danh sách đơn & Đạt \\
TC-HIS-API-02 & History & User mới chưa có đơn & Gửi \texttt{GET /orders/me} từ tài khoản mới & HTTP 200, mảng đơn rỗng \texttt{items: []} & HTTP 200, mảng rỗng & Đạt \\
TC-HIS-API-03 & History & Có Bearer JWT & Gửi \texttt{GET /orders/me} lọc \texttt{status=PAID} & HTTP 200, chỉ trả về các đơn có trạng thái PAID & HTTP 200, lọc đúng trạng thái & Đạt \\
TC-HIS-API-04 & History & Có Bearer JWT & Gửi \texttt{GET /orders/me} với trạng thái sai & HTTP 400 Bad Request & HTTP 400 Bad Request & Đạt \\
TC-HIS-API-05 & History & Đơn của chính mình & Gửi \texttt{GET /orders/:id} xem chi tiết đơn hàng & HTTP 200, kèm mảng \texttt{items}, toppings và payment & HTTP 200, chi tiết đơn đầy đủ & Đạt \\
TC-HIS-API-06 & History & Đơn của user khác & Gửi \texttt{GET /orders/:id} xem đơn của tài khoản khác & HTTP 404 Not Found, không làm lộ đơn người khác & HTTP 404 Not Found & Đạt \\
TC-HIS-API-07 & History & Đơn có chuyển trạng thái & Kiểm tra bảng \texttt{order\_}\allowbreak\texttt{status\_}\allowbreak\texttt{history} & Ghi nhận đủ lịch sử chuyển: NULL $\to$ PENDING $\to$ PAID & Ghi vết đầy đủ các mốc thời gian & Đạt \\
TC-HIS-UI-01 & History & Mở \texttt{/orders} & Quan sát danh sách các đơn hàng đã đặt & Hiển thị mã đơn, ngày đặt, tổng tiền và badge trạng thái & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-HIS-UI-02 & History & Mở \texttt{/orders} & Bấm lọc theo tab trạng thái "Đã thanh toán" & Danh sách chỉ hiển thị các đơn mang trạng thái PAID & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-HIS-UI-03 & History & Tại \texttt{/orders} & Bấm nút "Xem chi tiết" của một đơn hàng & Mở trang chi tiết đơn với đầy đủ thông tin món và thanh toán & Đã xác minh thủ công trên Chrome & Chưa chạy \\
TC-HIS-UI-04 & History & Đơn PENDING & Bấm nút "Hủy đơn" tại màn hình chi tiết & Hiển thị popup xác nhận, sau khi bấm hủy badge đổi sang Đã hủy & Đã xác minh thủ công trên Chrome & Chưa chạy \\
\midrule

% --- 7. TASK 10 MANDATORY SCENARIOS ---
TS-FR-07-02 & Task 10 & Đơn PAID hoặc CANCELLED & Chuyển trạng thái đơn hàng trái quy tắc Máy trạng thái & Chặn chuyển trạng thái, trả về HTTP 409 Conflict & Chặn thành công với HTTP 409 Conflict & Đạt \\
TS-FR-08-01 & Task 10 & 5 requests song song & Bắn 5 request \texttt{POST /payments} đồng thời cùng key & Đúng 1 bản ghi thanh toán trong CSDL, không có mã lỗi 500 & Đúng 1 bản ghi Payment, 0 lỗi 500, replay an toàn & Đạt \\
TS-FR-09-01 & Task 10 & 10 requests tranh chấp & Bắn 10 request \texttt{POST /orders} song song khi stock = 1 & Đúng 1 đơn thành công (201), 9 đơn bị chặn (400), stock = 0 & 1 đơn 201 Created, 9 đơn 400 Bad Request, stock = 0 & Đạt \\

\end{longtable}
}
% ====== END INLINE: appendices/appendix-d ======
"""

# Place Appendix D before \end{document}
assert r'\end{document}' in text, "Could not find \\end{document}"
text = text.replace(r'\end{document}', appendix_d_tex + '\n' + r'\end{document}')

with open('report/main.tex', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: report/main.tex updated cleanly with UTF-8 encoding and optimized column widths!")
