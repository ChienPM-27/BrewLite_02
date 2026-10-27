import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def replace_or_assert(content, old, new, desc, file_path):
    if old not in content:
        raise ValueError(f"Target '{desc}' not found in {file_path}!\nSearch snippet: {old[:80]}...")
    return content.replace(old, new)

# 1. Update ch1-introduction.tex
def update_ch1():
    path = 'report/chapters/ch1-introduction.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Target 1: Tinh toan chi phi minh bach
    old1 = r"\item \textbf{Tính toán chi phí minh bạch:} Tích hợp bộ máy tính giá tự động bao gồm phụ thu theo size/topping, áp dụng mã giảm giá (voucher) và đổi điểm thành viên thân thiết (loyalty points)."
    new1 = r"\item \textbf{Tính toán chi phí minh bạch:} Tích hợp bộ máy tính giá tự động bao gồm phụ thu theo size/topping, áp dụng mã giảm giá (voucher) và tích lũy điểm thưởng thành viên thân thiết (Loyalty Points) sau khi hoàn tất thanh toán."
    c = replace_or_assert(c, old1, new1, "ch1: minh bach", path)

    # Target 2: Phan he Dat hang
    old2 = r"\item \textbf{Phân hệ Đặt hàng (Order):} Tạo đơn hàng chính thức từ giỏ hàng, kiểm tra tính khả dụng của tồn kho, áp dụng mã ưu đãi \texttt{WELCOME10}, quy đổi điểm tích lũy và chuyển đổi trạng thái đơn hàng."
    new2 = r"\item \textbf{Phân hệ Đặt hàng (Order):} Tạo đơn hàng chính thức từ giỏ hàng, kiểm tra tính khả dụng của tồn kho, áp dụng mã ưu đãi \texttt{WELCOME10}, tự động tính điểm tích lũy dự kiến và chuyển đổi trạng thái đơn hàng."
    c = replace_or_assert(c, old2, new2, "ch1: dat hang", path)

    # Target 3: Out-of-Scope item
    old3 = r"""\paragraph{Giới hạn phạm vi (Out-of-Scope trong MVP):}
Để đảm bảo tiến độ và chất lượng cho các nghiệp vụ trọng tâm của khách hàng:
\begin{itemize}
    \item \textbf{Giao diện Pha chế (Barista Web UI):}"""
    
    new3 = r"""\paragraph{Giới hạn phạm vi (Out-of-Scope trong MVP):}
Để đảm bảo tiến độ và chất lượng cho các nghiệp vụ trọng tâm của khách hàng:
\begin{itemize}
    \item \textbf{Đổi điểm thưởng trừ tiền (Redeem Loyalty Points):} Hệ thống đã hiện thực trọn vẹn cơ chế tự động tích lũy điểm thưởng (\textit{Earn Points}) cho khách hàng sau khi thanh toán thành công (\(1.000 \text{ VNĐ} = 1 \text{ điểm}\)) và thiết kế sẵn sàng cấu trúc dữ liệu cho việc chi tiêu/hoàn điểm (\texttt{LoyaltyTransactionType.SPENT}, \texttt{REFUNDED}). Tuy nhiên, tính năng cho phép nhập điểm để trừ trực tiếp vào giá trị đơn hàng mới (\textit{Redeem Points}) được phân loại vào phạm vi mở rộng sau MVP (Post-MVP Backlog) để đảm bảo an toàn tuyệt đối cho luồng thanh toán và nghiệp vụ hoàn điểm khi hủy đơn.
    \item \textbf{Giao diện Pha chế (Barista Web UI):}"""
    c = replace_or_assert(c, old3, new3, "ch1: out of scope", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 2. Update ch2-requirements.tex
def update_ch2():
    path = 'report/chapters/ch2-requirements.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Stakeholder
    old1 = r"\item \textbf{Khách hàng đã đăng ký (Registered Customer):} Khách hàng sở hữu tài khoản định danh trên hệ thống. Tác nhân này có đầy đủ quyền lợi: đặt hàng chính thức, áp dụng mã voucher ưu đãi, tích lũy và đổi điểm thưởng thành viên (Loyalty points), thanh toán trực tuyến và tra cứu toàn bộ lịch sử đơn hàng cá nhân."
    new1 = r"\item \textbf{Khách hàng đã đăng ký (Registered Customer):} Khách hàng sở hữu tài khoản định danh trên hệ thống. Tác nhân này có đầy đủ quyền lợi: đặt hàng chính thức, áp dụng mã voucher ưu đãi, tích lũy điểm thưởng thành viên (Loyalty Points), thanh toán trực tuyến và tra cứu toàn bộ lịch sử đơn hàng cá nhân."
    c = replace_or_assert(c, old1, new1, "ch2: registered customer", path)

    # FR-04
    old2 = r"\textbf{FR-04} & Đặt hàng \& Xử lý Chiết khấu & Khởi tạo đơn hàng từ giỏ hàng; Kiểm tra tồn kho sản phẩm với Optimistic Locking; Áp dụng mã giảm giá hợp lệ; Quy đổi điểm tích lũy thành viên; Lưu vết snapshot giá tại thời điểm đặt. \\"
    new2 = r"\textbf{FR-04} & Đặt hàng \& Xử lý Chiết khấu & Khởi tạo đơn hàng từ giỏ hàng; Kiểm tra tồn kho sản phẩm với Optimistic Locking; Áp dụng mã giảm giá hợp lệ (\texttt{promotionCode}); Tự động tính điểm tích lũy thành viên dự kiến; Lưu vết snapshot giá tại thời điểm đặt. \\"
    c = replace_or_assert(c, old2, new2, "ch2: FR-04", path)

    # US-05 description
    old3 = r"""\textbf{Là một:} Khách hàng đã đăng nhập vào hệ thống BrewLite,\\
\textbf{Tôi muốn:} Thực hiện đặt các món trong giỏ hàng và áp dụng mã giảm giá hợp lệ kèm điểm tích lũy thành viên,\\
\textbf{Để:} Mua được đồ uống yêu thích với chi phí tiết kiệm nhất mà không phải xếp hàng thanh toán tại quầy."""
    new3 = r"""\textbf{Là một:} Khách hàng đã đăng nhập vào hệ thống BrewLite,\\
\textbf{Tôi muốn:} Thực hiện đặt các món trong giỏ hàng, áp dụng mã ưu đãi hợp lệ và được tích lũy điểm thưởng thành viên sau khi thanh toán,\\
\textbf{Để:} Mua được đồ uống yêu thích với chi phí tiết kiệm nhất và tích lũy ưu đãi cho các đơn hàng tương lai."""
    c = replace_or_assert(c, old3, new3, "ch2: US-05 desc", path)

    # Acceptance Criteria (Gherkin)
    old4 = r"""    \item \textit{Đặt hàng thành công với mã giảm giá hợp lệ và điểm tích lũy:}
    \begin{itemize}
        \item \textbf{Given:} Khách hàng có 3 món đồ uống trong giỏ hàng với tổng giá trị tạm tính là 120.000 VNĐ, tài khoản có 10 điểm thưởng và nhập mã voucher \texttt{WELCOME10}.
        \item \textbf{When:} Khách hàng chọn áp dụng mã voucher và nhấn nút "Xác nhận đặt hàng".
        \item \textbf{Then:} Hệ thống áp dụng chiết khấu 10\% (12.000 VNĐ), trừ 10 điểm thưởng (tương đương 10.000 VNĐ), tính tổng số tiền thanh toán là 98.000 VNĐ, kiểm tra đủ tồn kho, tạo đơn hàng ở trạng thái \texttt{PENDING\_PAYMENT} và điều hướng sang trang thanh toán.
    \end{itemize}"""
    new4 = r"""    \item \textit{Đặt hàng thành công với mã giảm giá hợp lệ và ghi nhận tích lũy điểm thưởng:}
    \begin{itemize}
        \item \textbf{Given:} Khách hàng có các món đồ uống trong giỏ hàng với tổng giá trị tạm tính là 120.000 VNĐ và nhập mã voucher \texttt{WELCOME10}.
        \item \textbf{When:} Khách hàng chọn áp dụng mã voucher và gửi yêu cầu tạo đơn hàng (\texttt{POST /api/v1/orders}).
        \item \textbf{Then:} Hệ thống áp dụng chiết khấu 10\% (12.000 VNĐ), tính tổng số tiền thanh toán chính xác là 108.000 VNĐ, kiểm tra đủ tồn kho với Optimistic Locking, tạo đơn hàng ở trạng thái \texttt{PENDING}, đồng thời tính toán điểm thưởng dự kiến tích lũy là +108 điểm khi thanh toán thành công và chuyển hướng sang trang thanh toán.
    \end{itemize}"""
    c = replace_or_assert(c, old4, new4, "ch2: Gherkin", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 3. Update ch3-architecture.tex
def update_ch3():
    path = 'report/chapters/ch3-architecture.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old1 = r"\item \textbf{PricingModule, PromotionsModule \& LoyaltyModule:} Các động cơ tính toán độc lập thực thi chính sách phụ thu tùy biến, kiểm tra hợp lệ của mã giảm giá \texttt{WELCOME10} và quy đổi điểm tích lũy thành viên."
    new1 = r"\item \textbf{PricingModule, PromotionsModule \& LoyaltyModule:} Các động cơ tính toán độc lập: \texttt{PricingModule} tính toán phụ thu kích cỡ/topping; \texttt{PromotionsModule} kiểm tra tính hợp lệ và chiết khấu của mã giảm giá (\texttt{WELCOME10}); \texttt{LoyaltyModule} đảm nhận cơ chế tự động tích lũy điểm thưởng thành viên theo tỷ lệ thực trả sau khi thanh toán thành công."
    c = replace_or_assert(c, old1, new1, "ch3: loyalty module", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 4. Update feature-order.tex
def update_feature_order():
    path = 'report/chapters/feature-order.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old1 = r"quy đổi điểm thành viên (\texttt{LoyaltyService})"
    new1 = r"tích lũy điểm thành viên (\texttt{LoyaltyService})"
    c = replace_or_assert(c, old1, new1, "feature-order: loyalty mention", path)

    old2 = r"\texttt{\{items: [\{productId, size, quantity, toppings\}], voucherCode?, pointsToRedeem?\}} (Header: \texttt{Authorization: Bearer <JWT>}) &"
    new2 = r"\texttt{\{items: [\{productId, size, quantity, toppings\}], promotionCode?\}} (Header: \texttt{Authorization: Bearer <JWT>}) &"
    c = replace_or_assert(c, old2, new2, "feature-order: API contract", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 5. Update ch6-advanced-logic.tex
def update_ch6():
    path = 'report/chapters/ch6-advanced-logic.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_block = r"""\subsection{Cơ chế Điểm thưởng Thành viên (Loyalty Points)}
\begin{itemize}
    \item \textbf{Tích lũy điểm (Earn Points):} Với mỗi đơn hàng được thanh toán thành công, khách hàng được tích lũy 1 điểm thưởng cho mỗi 10.000 VNĐ giá trị thực trả (\texttt{finalAmount}):
    \[
    \text{pointsEarned} = \left\lfloor \frac{\text{finalAmount}}{10.000} \right\rfloor
    \]
    \item \textbf{Quy đổi điểm (Redeem Points):} Khách hàng có thể sử dụng điểm tích lũy để trừ trực tiếp vào đơn hàng mới. Giá trị quy đổi là \(1 \text{ điểm} = 1.000 \text{ VNĐ}\). Nhằm đảm bảo an toàn doanh thu, hệ thống đặt ra quy tắc cứng: số tiền giảm từ điểm thưởng tối đa không được vượt quá 50\% giá trị đơn hàng sau khi đã trừ mã giảm giá.
    \item Mọi biến động cộng/trừ điểm đều được ghi vết minh bạch trong bảng \texttt{loyalty\_transactions}.
\end{itemize}"""

    new_block = r"""\subsection{Cơ chế Điểm thưởng Thành viên (Loyalty Points)}
\begin{itemize}
    \item \textbf{Tích lũy điểm tự động (Earn Points - Đã hiện thực trong MVP):}
    Nhằm tri ân và tăng tính gắn kết của khách hàng, hệ thống hiện thực cơ chế tích lũy điểm tự động được kích hoạt ngay khi đơn hàng chuyển sang trạng thái \texttt{PAID} thông qua phương thức \texttt{LoyaltyService.award()}. Tỷ lệ tích điểm thực tế trong mã nguồn là 1 điểm thưởng cho mỗi 1.000 VNĐ thanh toán thực trả (\texttt{finalAmount}):
    \[
    \text{pointsEarned} = \left\lfloor \frac{\text{finalAmount}}{1.000} \right\rfloor
    \]
    Tiến trình cộng điểm được thực thi nguyên tử trong cùng cơ chế giao dịch (\texttt{tx}), tự động tăng biến \texttt{loyaltyPoints} của người dùng, cập nhật trường \texttt{pointsEarned} của đơn hàng và ghi nhận một bản ghi biến động dạng \texttt{EARNED} vào bảng \texttt{loyalty\_transactions}. Cơ chế kiểm tra tồn tại giao dịch đảm bảo tính Idempotent, loại trừ nguy cơ cộng điểm trùng lặp khi có webhook gọi lại.

    \item \textbf{Quy đổi điểm trừ tiền (Redeem Points - Đặc tả Thiết kế phạm vi mở rộng Post-MVP):}
    Tại phiên bản MVP 1.0, nhằm tập trung bảo đảm an toàn tuyệt đối cho luồng thanh toán và giao dịch tài chính cốt lõi, tính năng nhập điểm để trừ trực tiếp vào đơn hàng mới được xếp vào danh mục phát triển mở rộng (\textit{Post-MVP Backlog}). Cấu trúc cơ sở dữ liệu đã được thiết kế sẵn sàng để đón đầu tính năng này trong các Sprint tiếp theo:
    \begin{itemize}
        \item Enum \texttt{LoyaltyTransactionType} đã hỗ trợ sẵn các loại giao dịch \texttt{SPENT} (tiêu điểm) và \texttt{REFUNDED} (hoàn trả điểm khi hủy đơn).
        \item Quy tắc quy đổi dự kiến: \(1 \text{ điểm} = 1.000 \text{ VNĐ}\), với trần khống chế số tiền giảm trừ tối đa không vượt quá 50\% giá trị đơn hàng sau chiết khấu khuyến mãi để đảm bảo tính an toàn tài chính.
    \end{itemize}
    \item Mọi biến động cộng điểm đều được ghi vết minh bạch trong bảng \texttt{loyalty\_transactions}.
\end{itemize}"""

    c = replace_or_assert(c, old_block, new_block, "ch6: loyalty points block", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 6. Update ch8-evaluation.tex
def update_ch8():
    path = 'report/chapters/ch8-evaluation.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Add limitation
    old_lim = r"""\begin{enumerate}
    \item \textbf{Giao diện Quầy Pha chế (Barista UI) ngoài phạm vi MVP):}"""
    if old_lim not in c:
        # Check actual format in file
        old_lim = r"\item \textbf{Giao diện Quầy Pha chế (Barista UI) ngoài phạm vi MVP:}"
        new_lim = r"""\item \textbf{Phân hệ Loyalty chỉ mới kích hoạt chiều tích điểm (Earn Points):} Phiên bản MVP hiện tại đã hoàn thiện trọn vẹn luồng tự động tích lũy điểm thưởng khi thanh toán thành công (\(1.000 \text{ VNĐ} = 1 \text{ điểm}\)). Tính năng dùng điểm để giảm trừ trực tiếp vào đơn hàng mới (\textit{Redeem Points}) và xử lý hoàn điểm tự động khi hủy đơn được lên kế hoạch bàn giao ở bản phát hành tiếp theo.
    \item \textbf{Giao diện Quầy Pha chế (Barista UI) ngoài phạm vi MVP:}"""
        c = replace_or_assert(c, old_lim, new_lim, "ch8: limitation", path)
    
    # Add future work
    old_future = r"\begin{itemize}" + "\n" + r"    \item \textbf{Xây dựng Màn hình Pha chế (Barista POS Display):}"
    new_future = r"""\begin{itemize}
    \item \textbf{Hiện thực hóa tính năng Đổi điểm thưởng (Redeem Loyalty Points):} Cung cấp giao diện cho phép khách hàng chủ động chọn số điểm muốn sử dụng tại bước thanh toán để khấu trừ trực tiếp vào giá trị đơn hàng, tích hợp cơ chế hoàn trả điểm tự động khi đơn hàng bị hủy theo chuẩn cấu trúc cơ sở dữ liệu đã thiết kế sẵn.
    \item \textbf{Xây dựng Màn hình Pha chế (Barista POS Display):}"""
    c = replace_or_assert(c, old_future, new_future, "ch8: future work", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 7. Update main.tex
def update_main():
    path = 'report/main.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Ch1 updates in main.tex
    old1 = r"\item \textbf{Tính toán chi phí minh bạch:} Tích hợp bộ máy tính giá tự động bao gồm phụ thu theo size/topping, áp dụng mã giảm giá (voucher) và đổi điểm thành viên thân thiết (loyalty points)."
    new1 = r"\item \textbf{Tính toán chi phí minh bạch:} Tích hợp bộ máy tính giá tự động bao gồm phụ thu theo size/topping, áp dụng mã giảm giá (voucher) và tích lũy điểm thưởng thành viên thân thiết (Loyalty Points) sau khi hoàn tất thanh toán."
    c = replace_or_assert(c, old1, new1, "main: ch1 minh bach", path)

    old2 = r"\item \textbf{Phân hệ Đặt hàng (Order):} Tạo đơn hàng chính thức từ giỏ hàng, kiểm tra tính khả dụng của tồn kho, áp dụng mã ưu đãi \texttt{WELCOME10}, quy đổi điểm tích lũy và chuyển đổi trạng thái đơn hàng."
    new2 = r"\item \textbf{Phân hệ Đặt hàng (Order):} Tạo đơn hàng chính thức từ giỏ hàng, kiểm tra tính khả dụng của tồn kho, áp dụng mã ưu đãi \texttt{WELCOME10}, tự động tính điểm tích lũy dự kiến và chuyển đổi trạng thái đơn hàng."
    c = replace_or_assert(c, old2, new2, "main: ch1 dat hang", path)

    old3 = r"""\paragraph{Giới hạn phạm vi (Out-of-Scope trong MVP):}
Để đảm bảo tiến độ và chất lượng cho các nghiệp vụ trọng tâm của khách hàng:
\begin{itemize}
    \item \textbf{Giao diện Pha chế (Barista Web UI):}"""
    new3 = r"""\paragraph{Giới hạn phạm vi (Out-of-Scope trong MVP):}
Để đảm bảo tiến độ và chất lượng cho các nghiệp vụ trọng tâm của khách hàng:
\begin{itemize}
    \item \textbf{Đổi điểm thưởng trừ tiền (Redeem Loyalty Points):} Hệ thống đã hiện thực trọn vẹn cơ chế tự động tích lũy điểm thưởng (\textit{Earn Points}) cho khách hàng sau khi thanh toán thành công (\(1.000 \text{ VNĐ} = 1 \text{ điểm}\)) và thiết kế sẵn sàng cấu trúc dữ liệu cho việc chi tiêu/hoàn điểm (\texttt{LoyaltyTransactionType.SPENT}, \texttt{REFUNDED}). Tuy nhiên, tính năng cho phép nhập điểm để trừ trực tiếp vào giá trị đơn hàng mới (\textit{Redeem Points}) được phân loại vào phạm vi mở rộng sau MVP (Post-MVP Backlog) để đảm bảo an toàn tuyệt đối cho luồng thanh toán và nghiệp vụ hoàn điểm khi hủy đơn.
    \item \textbf{Giao diện Pha chế (Barista Web UI):}"""
    c = replace_or_assert(c, old3, new3, "main: ch1 out of scope", path)

    # Ch2 updates in main.tex
    old4 = r"\item \textbf{Khách hàng đã đăng ký (Registered Customer):} Khách hàng sở hữu tài khoản định danh trên hệ thống. Tác nhân này có đầy đủ quyền lợi: đặt hàng chính thức, áp dụng mã voucher ưu đãi, tích lũy và đổi điểm thưởng thành viên (Loyalty points), thanh toán trực tuyến và tra cứu toàn bộ lịch sử đơn hàng cá nhân."
    new4 = r"\item \textbf{Khách hàng đã đăng ký (Registered Customer):} Khách hàng sở hữu tài khoản định danh trên hệ thống. Tác nhân này có đầy đủ quyền lợi: đặt hàng chính thức, áp dụng mã voucher ưu đãi, tích lũy điểm thưởng thành viên (Loyalty Points), thanh toán trực tuyến và tra cứu toàn bộ lịch sử đơn hàng cá nhân."
    c = replace_or_assert(c, old4, new4, "main: ch2 registered customer", path)

    old5 = r"\textbf{FR-04} & Đặt hàng \& Xử lý Chiết khấu & Khởi tạo đơn hàng từ giỏ hàng; Kiểm tra tồn kho sản phẩm với Optimistic Locking; Áp dụng mã giảm giá hợp lệ; Quy đổi điểm tích lũy thành viên; Lưu vết snapshot giá tại thời điểm đặt. \\"
    new5 = r"\textbf{FR-04} & Đặt hàng \& Xử lý Chiết khấu & Khởi tạo đơn hàng từ giỏ hàng; Kiểm tra tồn kho sản phẩm với Optimistic Locking; Áp dụng mã giảm giá hợp lệ (\texttt{promotionCode}); Tự động tính điểm tích lũy thành viên dự kiến; Lưu vết snapshot giá tại thời điểm đặt. \\"
    c = replace_or_assert(c, old5, new5, "main: ch2 FR-04", path)

    old6 = r"""\textbf{Là một:} Khách hàng đã đăng nhập vào hệ thống BrewLite,\\
\textbf{Tôi muốn:} Thực hiện đặt các món trong giỏ hàng và áp dụng mã giảm giá hợp lệ kèm điểm tích lũy thành viên,\\
\textbf{Để:} Mua được đồ uống yêu thích với chi phí tiết kiệm nhất mà không phải xếp hàng thanh toán tại quầy."""
    new6 = r"""\textbf{Là một:} Khách hàng đã đăng nhập vào hệ thống BrewLite,\\
\textbf{Tôi muốn:} Thực hiện đặt các món trong giỏ hàng, áp dụng mã ưu đãi hợp lệ và được tích lũy điểm thưởng thành viên sau khi thanh toán,\\
\textbf{Để:} Mua được đồ uống yêu thích với chi phí tiết kiệm nhất và tích lũy ưu đãi cho các đơn hàng tương lai."""
    c = replace_or_assert(c, old6, new6, "main: ch2 US-05 desc", path)

    old7 = r"""    \item \textit{Đặt hàng thành công với mã giảm giá hợp lệ và điểm tích lũy:}
    \begin{itemize}
        \item \textbf{Given:} Khách hàng có 3 món đồ uống trong giỏ hàng với tổng giá trị tạm tính là 120.000 VNĐ, tài khoản có 10 điểm thưởng và nhập mã voucher \texttt{WELCOME10}.
        \item \textbf{When:} Khách hàng chọn áp dụng mã voucher và nhấn nút "Xác nhận đặt hàng".
        \item \textbf{Then:} Hệ thống áp dụng chiết khấu 10\% (12.000 VNĐ), trừ 10 điểm thưởng (tương đương 10.000 VNĐ), tính tổng số tiền thanh toán là 98.000 VNĐ, kiểm tra đủ tồn kho, tạo đơn hàng ở trạng thái \texttt{PENDING\_PAYMENT} và điều hướng sang trang thanh toán.
    \end{itemize}"""
    new7 = r"""    \item \textit{Đặt hàng thành công với mã giảm giá hợp lệ và ghi nhận tích lũy điểm thưởng:}
    \begin{itemize}
        \item \textbf{Given:} Khách hàng có các món đồ uống trong giỏ hàng với tổng giá trị tạm tính là 120.000 VNĐ và nhập mã voucher \texttt{WELCOME10}.
        \item \textbf{When:} Khách hàng chọn áp dụng mã voucher và gửi yêu cầu tạo đơn hàng (\texttt{POST /api/v1/orders}).
        \item \textbf{Then:} Hệ thống áp dụng chiết khấu 10\% (12.000 VNĐ), tính tổng số tiền thanh toán chính xác là 108.000 VNĐ, kiểm tra đủ tồn kho với Optimistic Locking, tạo đơn hàng ở trạng thái \texttt{PENDING}, đồng thời tính toán điểm thưởng dự kiến tích lũy là +108 điểm khi thanh toán thành công và chuyển hướng sang trang thanh toán.
    \end{itemize}"""
    c = replace_or_assert(c, old7, new7, "main: ch2 Gherkin", path)

    # Ch3 updates in main.tex
    old8 = r"\item \textbf{PricingModule, PromotionsModule \& LoyaltyModule:} Các động cơ tính toán độc lập thực thi chính sách phụ thu tùy biến, kiểm tra hợp lệ của mã giảm giá \texttt{WELCOME10} và quy đổi điểm tích lũy thành viên."
    new8 = r"\item \textbf{PricingModule, PromotionsModule \& LoyaltyModule:} Các động cơ tính toán độc lập: \texttt{PricingModule} tính toán phụ thu kích cỡ/topping; \texttt{PromotionsModule} kiểm tra tính hợp lệ và chiết khấu của mã giảm giá (\texttt{WELCOME10}); \texttt{LoyaltyModule} đảm nhận cơ chế tự động tích lũy điểm thưởng thành viên theo tỷ lệ thực trả sau khi thanh toán thành công."
    c = replace_or_assert(c, old8, new8, "main: ch3 loyalty module", path)

    # Feature Order updates in main.tex
    old9 = r"quy đổi điểm thành viên (\texttt{LoyaltyService})"
    new9 = r"tích lũy điểm thành viên (\texttt{LoyaltyService})"
    c = replace_or_assert(c, old9, new9, "main: feature order loyalty mention", path)

    old10 = r"\texttt{\{items: [\{productId, size, quantity, toppings\}], voucherCode?, pointsToRedeem?\}} (Header: \texttt{Authorization: Bearer <JWT>}) &"
    new10 = r"\texttt{\{items: [\{productId, size, quantity, toppings\}], promotionCode?\}} (Header: \texttt{Authorization: Bearer <JWT>}) &"
    c = replace_or_assert(c, old10, new10, "main: feature order API contract", path)

    # Ch6 updates in main.tex
    old_block_ch6 = r"""\subsection{Cơ chế Điểm thưởng Thành viên (Loyalty Points)}
\begin{itemize}
    \item \textbf{Tích lũy điểm (Earn Points):} Với mỗi đơn hàng được thanh toán thành công, khách hàng được tích lũy 1 điểm thưởng cho mỗi 10.000 VNĐ giá trị thực trả (\texttt{finalAmount}):
    \[
    \text{pointsEarned} = \left\lfloor \frac{\text{finalAmount}}{10.000} \right\rfloor
    \]
    \item \textbf{Quy đổi điểm (Redeem Points):} Khách hàng có thể sử dụng điểm tích lũy để trừ trực tiếp vào đơn hàng mới. Giá trị quy đổi là \(1 \text{ điểm} = 1.000 \text{ VNĐ}\). Nhằm đảm bảo an toàn doanh thu, hệ thống đặt ra quy tắc cứng: số tiền giảm từ điểm thưởng tối đa không được vượt quá 50\% giá trị đơn hàng sau khi đã trừ mã giảm giá.
    \item Mọi biến động cộng/trừ điểm đều được ghi vết minh bạch trong bảng \texttt{loyalty\_transactions}.
\end{itemize}"""

    new_block_ch6 = r"""\subsection{Cơ chế Điểm thưởng Thành viên (Loyalty Points)}
\begin{itemize}
    \item \textbf{Tích lũy điểm tự động (Earn Points - Đã hiện thực trong MVP):}
    Nhằm tri ân và tăng tính gắn kết của khách hàng, hệ thống hiện thực cơ chế tích lũy điểm tự động được kích hoạt ngay khi đơn hàng chuyển sang trạng thái \texttt{PAID} thông qua phương thức \texttt{LoyaltyService.award()}. Tỷ lệ tích điểm thực tế trong mã nguồn là 1 điểm thưởng cho mỗi 1.000 VNĐ thanh toán thực trả (\texttt{finalAmount}):
    \[
    \text{pointsEarned} = \left\lfloor \frac{\text{finalAmount}}{1.000} \right\rfloor
    \]
    Tiến trình cộng điểm được thực thi nguyên tử trong cùng cơ chế giao dịch (\texttt{tx}), tự động tăng biến \texttt{loyaltyPoints} của người dùng, cập nhật trường \texttt{pointsEarned} của đơn hàng và ghi nhận một bản ghi biến động dạng \texttt{EARNED} vào bảng \texttt{loyalty\_transactions}. Cơ chế kiểm tra tồn tại giao dịch đảm bảo tính Idempotent, loại trừ nguy cơ cộng điểm trùng lặp khi có webhook gọi lại.

    \item \textbf{Quy đổi điểm trừ tiền (Redeem Points - Đặc tả Thiết kế phạm vi mở rộng Post-MVP):}
    Tại phiên bản MVP 1.0, nhằm tập trung bảo đảm an toàn tuyệt đối cho luồng thanh toán và giao dịch tài chính cốt lõi, tính năng nhập điểm để trừ trực tiếp vào đơn hàng mới được xếp vào danh mục phát triển mở rộng (\textit{Post-MVP Backlog}). Cấu trúc cơ sở dữ liệu đã được thiết kế sẵn sàng để đón đầu tính năng này trong các Sprint tiếp theo:
    \begin{itemize}
        \item Enum \texttt{LoyaltyTransactionType} đã hỗ trợ sẵn các loại giao dịch \texttt{SPENT} (tiêu điểm) và \texttt{REFUNDED} (hoàn trả điểm khi hủy đơn).
        \item Quy tắc quy đổi dự kiến: \(1 \text{ điểm} = 1.000 \text{ VNĐ}\), với trần khống chế số tiền giảm trừ tối đa không vượt quá 50\% giá trị đơn hàng sau chiết khấu khuyến mãi để đảm bảo tính an toàn tài chính.
    \end{itemize}
    \item Mọi biến động cộng điểm đều được ghi vết minh bạch trong bảng \texttt{loyalty\_transactions}.
\end{itemize}"""
    c = replace_or_assert(c, old_block_ch6, new_block_ch6, "main: ch6 loyalty points", path)

    # Ch8 updates in main.tex
    old_lim_main = r"\item \textbf{Giao diện Quầy Pha chế (Barista UI) ngoài phạm vi MVP:}"
    new_lim_main = r"""\item \textbf{Phân hệ Loyalty chỉ mới kích hoạt chiều tích điểm (Earn Points):} Phiên bản MVP hiện tại đã hoàn thiện trọn vẹn luồng tự động tích lũy điểm thưởng khi thanh toán thành công (\(1.000 \text{ VNĐ} = 1 \text{ điểm}\)). Tính năng dùng điểm để giảm trừ trực tiếp vào đơn hàng mới (\textit{Redeem Points}) và xử lý hoàn điểm tự động khi hủy đơn được lên kế hoạch bàn giao ở bản phát hành tiếp theo.
    \item \textbf{Giao diện Quầy Pha chế (Barista UI) ngoài phạm vi MVP:}"""
    c = replace_or_assert(c, old_lim_main, new_lim_main, "main: ch8 limitation", path)

    old_future_main = r"\begin{itemize}" + "\n" + r"    \item \textbf{Xây dựng Màn hình Pha chế (Barista POS Display):}"
    new_future_main = r"""\begin{itemize}
    \item \textbf{Hiện thực hóa tính năng Đổi điểm thưởng (Redeem Loyalty Points):} Cung cấp giao diện cho phép khách hàng chủ động chọn số điểm muốn sử dụng tại bước thanh toán để khấu trừ trực tiếp vào giá trị đơn hàng, tích hợp cơ chế hoàn trả điểm tự động khi đơn hàng bị hủy theo chuẩn cấu trúc cơ sở dữ liệu đã thiết kế sẵn.
    \item \textbf{Xây dựng Màn hình Pha chế (Barista POS Display):}"""
    c = replace_or_assert(c, old_future_main, new_future_main, "main: ch8 future work", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 8. Sync main_full.tex if exists
def update_main_full():
    path = 'report/main_full.tex'
    if not os.path.exists(path):
        return
    with open('report/main.tex', 'r', encoding='utf-8') as f:
        main_c = f.read()
    with open(path, 'w', encoding='utf-8') as f:
        f.write(main_c)
    print(f"Synchronized {path} with main.tex")

if __name__ == '__main__':
    update_ch1()
    update_ch2()
    update_ch3()
    update_feature_order()
    update_ch6()
    update_ch8()
    update_main()
    update_main_full()
    print("ALL UPDATES COMPLETED SUCCESSFULLY!")
