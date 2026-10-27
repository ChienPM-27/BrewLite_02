# Báo Cáo Bài Tập Lớn Môn Công Nghệ Phần Mềm - Dự Án BrewLite

Báo cáo học thuật trình bày thiết kế và hiện thực hóa hệ thống đặt cà phê trực tuyến **BrewLite**, thực hiện bởi nhóm sinh viên khoa Công nghệ Thông tin, Trường Đại học Sài Gòn.

---

## 1. Yêu cầu Biên dịch & Môi trường

Báo cáo được soạn thảo bằng **LaTeX** và yêu cầu trình biên dịch **XeLaTeX** để hỗ trợ đầy đủ phông chữ Unicode tiếng Việt (Times New Roman) và chèn các sơ đồ vector định dạng PDF.

### A. Biên dịch Cục bộ (Local)
1. Cài đặt bản phân phối TeX:
   - **Windows:** MiKTeX (khuyến nghị) hoặc TeX Live.
   - **Linux / macOS:** TeX Live / MacTeX (`texlive-full`, `texlive-xetex`).
2. Mở terminal tại thư mục `report/`:
   ```bash
   # Lệnh biên dịch bằng xelatex (chạy 2 lần để cập nhật số trang, mục lục, bảng biểu):
   xelatex -interaction=nonstopmode main.tex
   xelatex -interaction=nonstopmode main.tex
   ```
   Hoặc sử dụng `latexmk`:
   ```bash
   latexmk -xelatex main.tex
   ```
   Hoặc sử dụng `make` (trên Linux/WSL/Git Bash):
   ```bash
   make
   ```

### B. Biên dịch trên Overleaf
1. Nén toàn bộ thư mục `report/` thành file zip (bao gồm các thư mục con `figures/`, `chapters/`, `appendices/`, `main.tex`).
2. Tạo dự án mới trên [Overleaf](https://www.overleaf.com/) và tải file zip lên.
3. Vào **Menu** (góc trên bên trái):
   - **Compiler:** Đổi từ `pdfLaTeX` sang **`XeLaTeX`**.
   - **TeX Live version:** Chọn bản mới nhất (2024 hoặc 2025).
4. Nhấn **Recompile** để xuất file PDF hoàn chỉnh.

---

## 2. Cấu trúc Thư mục

```text
report/
├── main.tex                 # Tệp tài liệu nguồn chính
├── Makefile                 # Kịch bản make biên dịch tự động
├── latexmkrc                # Cấu hình latexmk cho xelatex
├── .gitignore               # Loại bỏ các tệp rác (.aux, .log, .toc...)
├── README.md                # Tài liệu hướng dẫn biên dịch
├── figures/                 # Chứa 26 sơ đồ vector PDF đã chuyển đổi từ SVG
│   ├── usecase-*.pdf        # 7 sơ đồ Use Case
│   ├── activity-*.pdf       # 7 sơ đồ Hoạt động (Activity)
│   ├── sequence-*.pdf       # 7 sơ đồ Tuần tự (Sequence)
│   └── *.pdf                # 5 sơ đồ Kiến trúc & ERD
├── chapters/                # Nội dung các chương chính
│   ├── cover.tex            # Trang bìa
│   ├── ch1-introduction.tex # Chương 1: Giới thiệu dự án & Quy trình Scrum
│   ├── ch2-requirements.tex # Chương 2: Yêu cầu chức năng & phi chức năng
│   ├── ch3-architecture.tex # Chương 3: Kiến trúc phân tầng & Docker
│   ├── ch4-database.tex     # Chương 4: Thiết kế CSDL (ERD 12 bảng)
│   ├── ch5-features.tex     # Chương 5: Thiết kế chi tiết 7 phân hệ
│   │   ├── feature-auth.tex
│   │   ├── feature-catalog.tex
│   │   ├── feature-detail.tex
│   │   ├── feature-cart.tex
│   │   ├── feature-order.tex
│   │   ├── feature-payment.tex
│   │   └── feature-history.tex
│   ├── ch6-advanced-logic.tex # Chương 6: Nghiệp vụ nâng cao (State Machine, Idempotency, Concurrency)
│   ├── ch7-implementation.tex # Chương 7: Minh chứng cài đặt & Ma trận đối chiếu GD1/GD2
│   └── ch8-evaluation.tex   # Chương 8: Đánh giá & Hướng phát triển
├── appendices/              # Các phụ lục bổ sung
│   ├── appendix-a.tex       # Phụ lục A: Ma trận truy vết yêu cầu (Traceability Matrix)
│   ├── appendix-b.tex       # Phụ lục B: Danh mục toàn bộ API Endpoints
│   └── appendix-c.tex       # Phụ lục C: Từ điển dữ liệu (Data Dictionary 12 thực thể)
└── scripts/
    └── convert_svg_to_pdf.py # Kịch bản trích xuất vector PDF từ PlantUML SVG
```

---

## 3. Các Vị trí Đánh dấu Cần Điền (\todo)
Các trường thông tin thực tế được đánh dấu bằng lệnh `\todo{...}` màu đỏ nổi bật để người dùng dễ dàng hoàn thiện thông tin trước khi nộp bài:
1. **Thông tin Trang bìa:**
   - Họ tên Giảng viên hướng dẫn.
   - Danh sách sinh viên thực hiện (Họ tên, MSSV, Phân hệ đảm nhận, Lớp, Khóa).
2. **Quy trình Scrum (Chương 1):**
   - Ngày bắt đầu và kết thúc chu kỳ Sprint 1, Sprint 2.
   - Số liệu Burndown và Velocity thực tế của nhóm.
   - Tóm tắt bài học kinh nghiệm sau Retrospective.
   - Phân công vai trò Product Owner (PO) và Scrum Master (SM).
3. **Ảnh chụp Giao diện Thực tế (Chương 5):**
   - Vị trí chèn ảnh chụp màn hình tương ứng cho 7 phân hệ giao diện: Đăng nhập/Đăng ký, Thực đơn, Chi tiết món, Giỏ hàng, Đặt hàng, Thanh toán và Lịch sử đơn hàng.
