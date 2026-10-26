import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def replace_or_assert(content, old, new, desc, file_path):
    if old not in content:
        raise ValueError(f"Target '{desc}' not found in {file_path}!\nSearch snippet: {old[:80]}...")
    return content.replace(old, new)

# 1. Update ch6-advanced-logic.tex
def update_ch6():
    path = 'report/chapters/ch6-advanced-logic.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_promo = r"""\subsection{Cơ chế Mã giảm giá (Promotions Engine)}
Hệ thống hỗ trợ cấu hình mã giảm giá đa dạng được quản lý trong bảng \texttt{promotions}. Tiêu biểu là mã ưu đãi \texttt{WELCOME10}:
\begin{itemize}
    \item \textbf{Mã code:} \texttt{WELCOME10}.
    \item \textbf{Tỷ lệ chiết khấu:} Giảm 10\% trên tổng giá trị tạm tính của đơn hàng (\texttt{total\_amount}).
    \item \textbf{Điều kiện áp dụng:} Giá trị đơn hàng tối thiểu (\texttt{min\_order\_amount}) phải đạt từ 100.000 VNĐ trở lên.
    \item \textbf{Mức giảm tối đa:} Giới hạn mức chiết khấu tối đa (\texttt{max\_discount}) là 50.000 VNĐ.
    \item Công thức tính:
    \[
    \text{discountAmount} = \min\left( \text{totalAmount} \times 10\%, 50.000 \right)
    \]
\end{itemize}"""

    new_promo = r"""\subsection{Cơ chế Mã giảm giá (Promotions Engine)}
Hệ thống hỗ trợ cấu hình mã giảm giá linh hoạt được quản lý trong bảng \texttt{promotions}, khởi tạo sẵn qua \texttt{prisma/seed.ts} phục vụ kiểm thử và trải nghiệm:
\begin{enumerate}
    \item \textbf{Mã \texttt{WELCOME10} (Chiết khấu phần trăm có mức trần):}
    \begin{itemize}
        \item \textbf{Mã code:} \texttt{WELCOME10}.
        \item \textbf{Tỷ lệ chiết khấu:} Giảm 10\% trên tổng giá trị tạm tính (\texttt{totalAmount}).
        \item \textbf{Điều kiện áp dụng:} Đơn hàng tối thiểu (\texttt{minOrderAmount}) đạt từ 40.000 VNĐ trở lên.
        \item \textbf{Mức giảm tối đa:} Giới hạn mức giảm trần (\texttt{maxDiscount}) là 20.000 VNĐ.
        \item Công thức tính trong \texttt{PromotionsService}:
        \[
        \text{discountAmount} = \min\left( \left\lfloor \frac{\text{totalAmount} \times 10}{100} \right\rfloor, 20.000 \right)
        \]
    \end{itemize}
    \item \textbf{Mã \texttt{GIAM15K} (Chiết khấu số tiền cố định):}
    \begin{itemize}
        \item \textbf{Mã code:} \texttt{GIAM15K}.
        \item \textbf{Mức chiết khấu:} Giảm trực tiếp 15.000 VNĐ (\texttt{discountAmount = 15.000}).
        \item \textbf{Điều kiện áp dụng:} Đơn hàng tối thiểu đạt từ 60.000 VNĐ trở lên.
    \end{itemize}
\end{enumerate}"""

    c = replace_or_assert(c, old_promo, new_promo, "ch6: promo engine", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 2. Update feature-order.tex
def update_feature_order():
    path = 'report/chapters/feature-order.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Step 2
    old2 = r"2. Khách hàng nhập mã giảm giá (ví dụ \texttt{WELCOME10}) và số điểm loyalty muốn đổi (nếu có).\newline"
    new2 = r"2. Khách hàng nhập mã giảm giá (ví dụ \texttt{WELCOME10}) nếu có.\newline"
    c = replace_or_assert(c, old2, new2, "feature-order: step 2", path)

    # Step 5d
    old5d = r"\quad d. Khấu trừ điểm loyalty qua \texttt{LoyaltyService} (tối đa 50\% giá trị đơn hàng).\newline"
    new5d = r"\quad d. Tính toán số điểm thưởng dự kiến tích lũy (\texttt{pointsEarned}).\newline"
    c = replace_or_assert(c, old5d, new5d, "feature-order: step 5d", path)

    # Test case TC-ORD-API-06
    old_tc = r"\texttt{TC-ORD-API-06} & Hợp lệ & Áp voucher WELCOME10 & \texttt{POST /orders} & Giảm 10\% (tối đa 50k), finalAmount chính xác & Chưa chạy \\"
    new_tc = r"\texttt{TC-ORD-API-06} & Hợp lệ & Áp voucher WELCOME10 & \texttt{POST /orders} & Giảm 10\% (tối đa 20k), finalAmount chính xác & Đạt \\"
    c = replace_or_assert(c, old_tc, new_tc, "feature-order: TC-ORD-API-06", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 3. Update ch4-database.tex
def update_ch4():
    path = 'report/chapters/ch4-database.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_db = r"\texttt{max\_discount} (mức giảm trần tối đa, ví dụ 50.000 VNĐ), \texttt{min\_order\_amount} (giá trị đơn tối thiểu, ví dụ 100.000 VNĐ)"
    new_db = r"\texttt{max\_discount} (mức giảm trần tối đa, ví dụ 20.000 VNĐ trong mã \texttt{WELCOME10}), \texttt{min\_order\_amount} (giá trị đơn tối thiểu, ví dụ 40.000 VNĐ trong mã \texttt{WELCOME10} hoặc 60.000 VNĐ trong mã \texttt{GIAM15K})"
    c = replace_or_assert(c, old_db, new_db, "ch4: promotions table description", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 4. Update appendix-c.tex
def update_appendix_c():
    path = 'report/appendices/appendix-c.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_app = r"\texttt{max\_discount} & DECIMAL(12,0) & Yes & NULL & Mức giảm tối đa (ví dụ 50.000đ) \\"
    new_app = r"\texttt{max\_discount} & DECIMAL(12,0) & Yes & NULL & Mức giảm tối đa (ví dụ 20.000đ) \\"
    c = replace_or_assert(c, old_app, new_app, "appendix-c: max_discount example", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 5. Update main.tex
def update_main():
    path = 'report/main.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Database section in main.tex
    old_db = r"\texttt{max\_discount} (mức giảm trần tối đa, ví dụ 50.000 VNĐ), \texttt{min\_order\_amount} (giá trị đơn tối thiểu, ví dụ 100.000 VNĐ)"
    new_db = r"\texttt{max\_discount} (mức giảm trần tối đa, ví dụ 20.000 VNĐ trong mã \texttt{WELCOME10}), \texttt{min\_order\_amount} (giá trị đơn tối thiểu, ví dụ 40.000 VNĐ trong mã \texttt{WELCOME10} hoặc 60.000 VNĐ trong mã \texttt{GIAM15K})"
    c = replace_or_assert(c, old_db, new_db, "main: promotions table description", path)

    # Feature Order section in main.tex
    old2 = r"2. Khách hàng nhập mã giảm giá (ví dụ \texttt{WELCOME10}) và số điểm loyalty muốn đổi (nếu có).\newline"
    new2 = r"2. Khách hàng nhập mã giảm giá (ví dụ \texttt{WELCOME10}) nếu có.\newline"
    c = replace_or_assert(c, old2, new2, "main: step 2", path)

    old5d = r"\quad d. Khấu trừ điểm loyalty qua \texttt{LoyaltyService} (tối đa 50\% giá trị đơn hàng).\newline"
    new5d = r"\quad d. Tính toán số điểm thưởng dự kiến tích lũy (\texttt{pointsEarned}).\newline"
    c = replace_or_assert(c, old5d, new5d, "main: step 5d", path)

    old_tc = r"\texttt{TC-ORD-API-06} & Hợp lệ & Áp voucher WELCOME10 & \texttt{POST /orders} & Giảm 10\% (tối đa 50k), finalAmount chính xác & Chưa chạy \\"
    new_tc = r"\texttt{TC-ORD-API-06} & Hợp lệ & Áp voucher WELCOME10 & \texttt{POST /orders} & Giảm 10\% (tối đa 20k), finalAmount chính xác & Đạt \\"
    c = replace_or_assert(c, old_tc, new_tc, "main: TC-ORD-API-06", path)

    # Ch6 section in main.tex
    old_promo = r"""\subsection{Cơ chế Mã giảm giá (Promotions Engine)}
Hệ thống hỗ trợ cấu hình mã giảm giá đa dạng được quản lý trong bảng \texttt{promotions}. Tiêu biểu là mã ưu đãi \texttt{WELCOME10}:
\begin{itemize}
    \item \textbf{Mã code:} \texttt{WELCOME10}.
    \item \textbf{Tỷ lệ chiết khấu:} Giảm 10\% trên tổng giá trị tạm tính của đơn hàng (\texttt{total\_amount}).
    \item \textbf{Điều kiện áp dụng:} Giá trị đơn hàng tối thiểu (\texttt{min\_order\_amount}) phải đạt từ 100.000 VNĐ trở lên.
    \item \textbf{Mức giảm tối đa:} Giới hạn mức chiết khấu tối đa (\texttt{max\_discount}) là 50.000 VNĐ.
    \item Công thức tính:
    \[
    \text{discountAmount} = \min\left( \text{totalAmount} \times 10\%, 50.000 \right)
    \]
\end{itemize}"""

    new_promo = r"""\subsection{Cơ chế Mã giảm giá (Promotions Engine)}
Hệ thống hỗ trợ cấu hình mã giảm giá linh hoạt được quản lý trong bảng \texttt{promotions}, khởi tạo sẵn qua \texttt{prisma/seed.ts} phục vụ kiểm thử và trải nghiệm:
\begin{enumerate}
    \item \textbf{Mã \texttt{WELCOME10} (Chiết khấu phần trăm có mức trần):}
    \begin{itemize}
        \item \textbf{Mã code:} \texttt{WELCOME10}.
        \item \textbf{Tỷ lệ chiết khấu:} Giảm 10\% trên tổng giá trị tạm tính (\texttt{totalAmount}).
        \item \textbf{Điều kiện áp dụng:} Đơn hàng tối thiểu (\texttt{minOrderAmount}) đạt từ 40.000 VNĐ trở lên.
        \item \textbf{Mức giảm tối đa:} Giới hạn mức giảm trần (\texttt{maxDiscount}) là 20.000 VNĐ.
        \item Công thức tính trong \texttt{PromotionsService}:
        \[
        \text{discountAmount} = \min\left( \left\lfloor \frac{\text{totalAmount} \times 10}{100} \right\rfloor, 20.000 \right)
        \]
    \end{itemize}
    \item \textbf{Mã \texttt{GIAM15K} (Chiết khấu số tiền cố định):}
    \begin{itemize}
        \item \textbf{Mã code:} \texttt{GIAM15K}.
        \item \textbf{Mức chiết khấu:} Giảm trực tiếp 15.000 VNĐ (\texttt{discountAmount = 15.000}).
        \item \textbf{Điều kiện áp dụng:} Đơn hàng tối thiểu đạt từ 60.000 VNĐ trở lên.
    \end{itemize}
\end{enumerate}"""
    c = replace_or_assert(c, old_promo, new_promo, "main: ch6 promo engine", path)

    # Appendix C in main.tex
    old_app = r"\texttt{max\_discount} & DECIMAL(12,0) & Yes & NULL & Mức giảm tối đa (ví dụ 50.000đ) \\"
    new_app = r"\texttt{max\_discount} & DECIMAL(12,0) & Yes & NULL & Mức giảm tối đa (ví dụ 20.000đ) \\"
    c = replace_or_assert(c, old_app, new_app, "main: appendix max_discount", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 6. Sync main_full.tex
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
    update_ch6()
    update_feature_order()
    update_ch4()
    update_appendix_c()
    update_main()
    update_main_full()
    print("ALL PROMOTIONS SEED FIXES COMPLETED SUCCESSFULLY!")
