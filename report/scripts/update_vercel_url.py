import os
import re

def update_ch3(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_frontend_item = r"\item \textbf{Frontend Web App (Vercel):} Ứng dụng Next.js 15 được triển khai tự động lên nền tảng máy chủ Serverless của Vercel, tận dụng mạng phân phối nội dung toàn cầu (Edge Network CDN) để tối ưu hóa tốc độ tải trang và hỗ trợ Server-Side Rendering (SSR)."
    new_frontend_item = r"\item \textbf{Frontend Web App (Vercel):} Ứng dụng Next.js 15 được triển khai tự động lên nền tảng máy chủ Serverless của Vercel tại địa chỉ chính thức \url{https://brew-lite.vercel.app/}, tận dụng mạng phân phối nội dung toàn cầu (Edge Network CDN) để tối ưu hóa tốc độ tải trang và hỗ trợ Server-Side Rendering (SSR)."
    
    old_table_row = r"\textbf{Frontend} & Vercel \newline (Edge CDN Global) &"
    new_table_row = r"\textbf{Frontend} & Vercel (Edge CDN) \newline \url{https://brew-lite.vercel.app} &"
    
    old_cors = r"\texttt{CORS\_ORIGIN = https://brewlite.vercel.app} \newline"
    new_cors = r"\texttt{CORS\_ORIGIN = https://brew-lite.vercel.app} \newline"
    
    assert old_frontend_item in content, f"old_frontend_item not found in {path}"
    assert old_table_row in content, f"old_table_row not found in {path}"
    assert old_cors in content, f"old_cors not found in {path}"
    
    content = content.replace(old_frontend_item, new_frontend_item)
    content = content.replace(old_table_row, new_table_row)
    content = content.replace(old_cors, new_cors)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {path}")

def update_main(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_frontend_item = r"\item \textbf{Frontend Web App (Vercel):} Ứng dụng Next.js 15 được triển khai tự động lên nền tảng máy chủ Serverless của Vercel, tận dụng mạng phân phối nội dung toàn cầu (Edge Network CDN) để tối ưu hóa tốc độ tải trang và hỗ trợ Server-Side Rendering (SSR)."
    new_frontend_item = r"\item \textbf{Frontend Web App (Vercel):} Ứng dụng Next.js 15 được triển khai tự động lên nền tảng máy chủ Serverless của Vercel tại địa chỉ chính thức \url{https://brew-lite.vercel.app/}, tận dụng mạng phân phối nội dung toàn cầu (Edge Network CDN) để tối ưu hóa tốc độ tải trang và hỗ trợ Server-Side Rendering (SSR)."
    
    old_table_row = r"\textbf{Frontend} & Vercel \newline (Edge CDN Global) &"
    new_table_row = r"\textbf{Frontend} & Vercel (Edge CDN) \newline \url{https://brew-lite.vercel.app} &"
    
    old_cors = r"\texttt{CORS\_ORIGIN = https://brewlite.vercel.app} \newline"
    new_cors = r"\texttt{CORS\_ORIGIN = https://brew-lite.vercel.app} \newline"
    
    old_progress = r"và bản triển khai trực tiếp trên Vercel / Render."
    new_progress = r"và bản triển khai trực tiếp trên Vercel (\url{https://brew-lite.vercel.app/}) / Render."
    
    assert old_frontend_item in content, f"old_frontend_item not found in {path}"
    assert old_table_row in content, f"old_table_row not found in {path}"
    assert old_cors in content, f"old_cors not found in {path}"
    assert old_progress in content, f"old_progress not found in {path}"
    
    content = content.replace(old_frontend_item, new_frontend_item)
    content = content.replace(old_table_row, new_table_row)
    content = content.replace(old_cors, new_cors)
    content = content.replace(old_progress, new_progress)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {path}")

def sync_ch1():
    # Read the updated Scrum section from main.tex
    with open('report/main.tex', 'r', encoding='utf-8') as f:
        main_c = f.read()
    
    start_marker = r"\section{Quy trình phát triển phần mềm}"
    end_marker = r"\caption{Tổng kết tiến độ, vai trò phân công và bài học cải tiến quy trình của nhóm}"
    end_figure = r"\end{figure}"
    
    idx1 = main_c.find(start_marker)
    idx2 = main_c.find(end_marker, idx1)
    idx3 = main_c.find(end_figure, idx2) + len(end_figure)
    
    section_text = main_c[idx1:idx3]
    
    with open('report/chapters/ch1-introduction.tex', 'r', encoding='utf-8') as f:
        ch1_c = f.read()
    
    ch1_idx1 = ch1_c.find(start_marker)
    ch1_c_new = ch1_c[:ch1_idx1] + section_text + "\n"
    
    with open('report/chapters/ch1-introduction.tex', 'w', encoding='utf-8') as f:
        f.write(ch1_c_new)
    print("Successfully synchronized report/chapters/ch1-introduction.tex")

if __name__ == '__main__':
    update_ch3('report/chapters/ch3-architecture.tex')
    update_main('report/main.tex')
    sync_ch1()
