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

    # Idempotency section
    old_idem = r"""    \item \textbf{Mã hóa toàn vẹn dữ liệu (\texttt{request\_hash}):} Backend nhận request và tính toán mã băm SHA-256 trên nội dung JSON của request body. Mã băm này đại diện cho tính nguyên vẹn của giao dịch.
    \item \textbf{Kiểm tra và Điều phối giao dịch:}
    \begin{itemize}
        \item \textbf{Trường hợp 1 (Trùng lặp thành công - Replay):} Nếu \texttt{idempotency\_key} đã tồn tại trong bảng \texttt{payments} và có trạng thái \texttt{SUCCESS}, hệ thống lập tức trả về kết quả đã lưu trước đó mà không thực hiện gọi sang Mock Gateway.
        \item \textbf{Trường hợp 2 (Xung đột đồng thời - Concurrent Request):} Nếu \texttt{idempotency\_key} đang ở trạng thái \texttt{PENDING} (giao dịch trước đó đang xử lý dở dang), hệ thống lập tức từ chối và ném lỗi \texttt{409 Conflict}.
        \item \textbf{Trường hợp 3 (Sai lệch tải trọng - Payload Tampering):} Nếu \texttt{idempotency\_key} trùng nhưng \texttt{request\_hash} khác nhau (ví dụ cố tình gửi cùng key nhưng đổi số tiền hoặc ID đơn hàng), hệ thống ném lỗi \texttt{422 Unprocessable Entity}.
        \item \textbf{Trường hợp 4 (Giao dịch mới):} Bản ghi thanh toán được tạo với trạng thái \texttt{PENDING}, gọi cổng thanh toán, sau đó cập nhật kết quả cuối cùng.
    \end{itemize}"""

    new_idem = r"""    \item \textbf{Mã hóa toàn vẹn dữ liệu (\texttt{request\_hash}):} Backend nhận request và tính toán mã băm SHA-256 trên chuỗi JSON chứa thông tin đơn hàng và phương thức thanh toán: \texttt{\{ orderId, method \}}. Mã băm này đại diện cho tính toàn vẹn của giao dịch.
    \item \textbf{Kiểm tra và Điều phối giao dịch:}
    \begin{itemize}
        \item \textbf{Trường hợp 1 (Khóa đã tồn tại \& Trùng khớp nội dung):} Nếu \texttt{idempotency\_key} đã tồn tại trong cơ sở dữ liệu và \texttt{request\_hash} trùng khớp, hệ thống gọi hàm \texttt{replayExistingPayment()} để phát lại (\textit{replay}) ngay kết quả thanh toán đã lưu trước đó mà không gọi lại Mock Gateway.
        \item \textbf{Trường hợp 2 (Sai lệch tải trọng - Payload Tampering):} Nếu \texttt{idempotency\_key} đã được sử dụng nhưng \texttt{request\_hash} khác nhau (ví dụ cố tình gửi cùng key nhưng đổi phương thức thanh toán hoặc ID đơn hàng), hệ thống ném ngoại lệ \texttt{409 ConflictException} (\texttt{"Idempotency-Key đã được sử dụng với nội dung khác"}).
        \item \textbf{Trường hợp 3 (Tranh chấp đồng thời - Concurrency Race Condition):} Khi hai request mang cùng một khóa đến gần như đồng thời, cơ sở dữ liệu chặn lại bằng ràng buộc duy nhất (\texttt{@unique}) và trả về mã lỗi \texttt{P2002}. Khối \texttt{catch} ở tầng Service nhận diện mã lỗi \texttt{P2002}, truy vấn lại bản ghi thanh toán vừa được tạo thành công và phát lại (\textit{replay}) kết quả an toàn mà không ném lỗi \texttt{409} hay gây trừ tiền lặp.
        \item \textbf{Trường hợp 4 (Giao dịch mới):} Bản ghi thanh toán được tạo với trạng thái \texttt{PENDING}, gọi cổng thanh toán giả lập, sau đó cập nhật kết quả cuối cùng (\texttt{SUCCESS} hoặc \texttt{FAILED}).
    \end{itemize}"""
    if old_idem in c:
        c = replace_or_assert(c, old_idem, new_idem, "ch6: idempotency cases", path)

    # Concurrency control section
    old_cc = r"""    \item Nếu hai giao dịch đồng thời cùng đọc phiên bản \(version = 0\), giao dịch thứ nhất thực thi thành công sẽ đẩy phiên bản lên \(version = 1\). Giao dịch thứ hai khi cập nhật sẽ nhận số dòng bị ảnh hưởng là 0 (\texttt{affected\_rows = 0}).
    \item Khi phát hiện số dòng cập nhật bằng 0, hệ thống ngay lập tức ném lỗi \texttt{409 ConflictException} ("Sản phẩm vừa có thay đổi, vui lòng thử lại"), đồng thời tự động rollback toàn bộ giao dịch tạo đơn, đảm bảo tồn kho tuyệt đối không bao giờ bị âm."""

    new_cc = r"""    \item Nếu hai giao dịch đồng thời cùng đọc phiên bản \(version = 0\), giao dịch thứ nhất thực thi thành công sẽ đẩy phiên bản lên \(version = 1\). Giao dịch thứ hai khi cập nhật sẽ nhận số dòng bị ảnh hưởng là 0 (\texttt{affected\_rows = 0}).
    \item Khi phát hiện số dòng cập nhật khác 1 (\texttt{result.count !== 1}), hệ thống ngay lập tức ném ngoại lệ \texttt{400 BadRequestException} (\texttt{"Insufficient stock or concurrent update for product <id>."}), đồng thời tự động rollback toàn bộ giao dịch tạo đơn, đảm bảo tồn kho tuyệt đối không bao giờ bị âm."""
    if old_cc in c:
        c = replace_or_assert(c, old_cc, new_cc, "ch6: concurrency control 400", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 2. Update ch7-implementation.tex
def update_ch7():
    path = 'report/chapters/ch7-implementation.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_code_order = r"""\subsection{Interactive Transaction và Khóa Lạc quan trong OrdersService}
\begin{lstlisting}[language=Java]
// backend/src/modules/orders/orders.service.ts
return await this.prisma.$transaction(async (tx) => {
  for (const item of dto.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stock < item.quantity) {
      throw new BadRequestException(`San pham ${product?.name} khong du ton kho`);
    }

    const updated = await tx.product.updateMany({
      where: { id: item.productId, version: product.version },
      data: {
        stock: { decrement: item.quantity },
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictException('Xung dot ton kho, vui long thu lai');
    }
  }
  // Tiep tuc tao Order va OrderItems trong cung transaction...
});
\end{lstlisting}"""

    new_code_order = r"""\subsection{Interactive Transaction và Khóa Lạc quan trong OrdersService}
\begin{lstlisting}[language=Java]
// backend/src/modules/orders/orders.service.ts
// Product: optimistic locking theo version va ton kho trong tx
for (const [productId, quantity] of productQuantities) {
  const product = productById.get(productId);
  if (!product) {
    throw new BadRequestException(`Product ${productId} is unavailable.`);
  }

  const result = await tx.product.updateMany({
    where: {
      id: productId,
      isAvailable: true,
      version: product.version,
      stock: { gte: quantity },
    },
    data: {
      stock: { decrement: quantity },
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new BadRequestException(
      `Insufficient stock or concurrent update for product ${productId}.`,
    );
  }
}
\end{lstlisting}"""
    if old_code_order in c:
        c = replace_or_assert(c, old_code_order, new_code_order, "ch7: code order", path)

    old_code_pay = r"""\subsection{Kiểm tra Bất biến Idempotency trong PaymentsService}
\begin{lstlisting}[language=Java]
// backend/src/modules/payments/payments.service.ts
const existing = await this.prisma.payment.findUnique({
  where: { idempotencyKey: key },
});

if (existing) {
  if (existing.status === PaymentStatus.SUCCESS) {
    return existing; // Tra ve ngay ket qua da xu ly
  }
  if (existing.status === PaymentStatus.PENDING) {
    throw new ConflictException('Giao dich dang duoc xu ly, vui long cho');
  }
}
\end{lstlisting}"""

    new_code_pay = r"""\subsection{Kiểm tra Bất biến Idempotency và Xử lý Tranh chấp trong PaymentsService}
\begin{lstlisting}[language=Java]
// backend/src/modules/payments/payments.service.ts
// 1. Tinh requestHash tren { orderId, method }
const requestHash = createHash('sha256')
  .update(JSON.stringify({ orderId: body.orderId, method: body.method }))
  .digest('hex');

// 2. Kiem tra key da ton tai: phat lai ket qua da luu (replay)
const existingPayment = await this.prisma.payment.findUnique({
  where: { idempotencyKey: normalizedKey },
  include: { order: true },
});
if (existingPayment) {
  return this.replayExistingPayment(existingPayment, userId, requestHash);
}

// 3. Bat tranh chap dong thoi (Race Condition P2002) de replay an toan
try {
  return await this.prisma.$transaction(async (tx) => {
    // Tao payment voi unique idempotencyKey va requestHash...
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const paymentAfterRace = await this.prisma.payment.findUnique({
      where: { idempotencyKey: normalizedKey },
      include: { order: true },
    });
    if (paymentAfterRace) {
      return this.replayExistingPayment(paymentAfterRace, userId, requestHash);
    }
  }
  throw error;
}
\end{lstlisting}"""
    if old_code_pay in c:
        c = replace_or_assert(c, old_code_pay, new_code_pay, "ch7: code payment", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 3. Update feature-order.tex
def update_feature_order():
    path = 'report/chapters/feature-order.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old1 = r"- Xung đột phiên bản (Optimistic Lock Conflict): Báo lỗi \texttt{409 Conflict}, rollback transaction.\newline"
    new1 = r"- Thiếu tồn kho hoặc xung đột phiên bản (Optimistic Lock Conflict): Báo lỗi \texttt{400 Bad Request} (\texttt{\"Insufficient stock or concurrent update...\"}), tự động rollback transaction.\newline"
    if old1 in c:
        c = replace_or_assert(c, old1, new1, "feature-order: exception flow", path)

    old2 = r"\texttt{201 Created}: Trả về đơn hàng mới tạo với cấu trúc bọc chuẩn \texttt{TransformInterceptor}. Lỗi: \texttt{400}, \texttt{401}, \texttt{409}. \\"
    new2 = r"\texttt{201 Created}: Trả về đơn hàng mới tạo với cấu trúc bọc chuẩn \texttt{TransformInterceptor}. Lỗi: \texttt{400 Bad Request}, \texttt{401 Unauthorized}. \\"
    if old2 in c:
        c = replace_or_assert(c, old2, new2, "feature-order: api errors", path)

    old3 = r"\texttt{TC-ORD-API-04} & Lỗi & Sai version (Optimistic) & \texttt{POST /orders} & HTTP 409 Conflict, ném lỗi xung đột & Chưa chạy \\"
    new3 = r"\texttt{TC-ORD-API-04} & Lỗi & Xung đột version (Optimistic) & \texttt{POST /orders} & HTTP 400 Bad Request (\"Insufficient stock or concurrent update...\"), rollback & Đạt \\"
    if old3 in c:
        c = replace_or_assert(c, old3, new3, "feature-order: TC-ORD-API-04", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 4. Update feature-payment.tex
def update_feature_payment():
    path = 'report/chapters/feature-payment.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_flow = r"""5. PaymentsService kiểm tra \texttt{idempotencyKey}:\newline
\quad a. Nếu khóa đã tồn tại trong DB với kết quả thành công: Trả về kết quả trước đó mà không xử lý lại.\newline
\quad b. Nếu khóa đang trong trạng thái xử lý (\texttt{PENDING}): Ném lỗi \texttt{409 Conflict}.\newline
\quad c. Nếu là khóa mới: Tạo bản ghi \texttt{payments} với trạng thái \texttt{PENDING} và lưu mã băm \texttt{requestHash}.\newline"""

    new_flow = r"""5. PaymentsService kiểm tra \texttt{idempotencyKey}:\newline
\quad a. Nếu khóa đã tồn tại trong DB: Gọi \texttt{replayExistingPayment()} đối chiếu mã băm SHA-256 trên \texttt{\{orderId, method\}}. Nếu trùng khớp, trả lại kết quả đã lưu mà không gọi lại Mock Gateway; nếu sai lệch tải trọng, ném ngoại lệ \texttt{409 Conflict}.\newline
\quad b. Nếu là khóa mới: Khởi tạo giao dịch \texttt{payments} trong \texttt{prisma.\$transaction} với trạng thái \texttt{PENDING} và lưu mã băm \texttt{requestHash}.\newline
\quad c. Xử lý tranh chấp đồng thời: Nếu hai request cùng gửi một khóa, lỗi trùng khóa Unique (\texttt{P2002}) được bắt trong khối \texttt{catch}, tự động truy vấn lại giao dịch vừa tạo và phát lại (\textit{replay}) kết quả an toàn.\newline"""
    if old_flow in c:
        c = replace_or_assert(c, old_flow, new_flow, "feature-payment: flow step 5", path)

    old_exc = r"- Trùng Idempotency-Key nhưng khác payload: Báo lỗi \texttt{422 Unprocessable Entity}. \\"
    new_exc = r"- Trùng Idempotency-Key nhưng khác payload: Báo lỗi \texttt{409 Conflict} (\"Idempotency-Key đã được sử dụng với nội dung khác\"). \\"
    if old_exc in c:
        c = replace_or_assert(c, old_exc, new_exc, "feature-payment: payload conflict 409", path)

    old_api = r"""Header: \texttt{Idempotency-Key: <UUID>}, Bearer Token.\newline Body: \texttt{\{orderId, paymentMethod\}} & 
\texttt{200 OK} / \texttt{201 Created}: Trả về chi tiết thanh toán thành công. Lỗi: \texttt{400}, \texttt{401}, \texttt{404}, \texttt{409 Conflict}. \\"""
    new_api = r"""Header: \texttt{Idempotency-Key: <UUID>}, Bearer Token.\newline Body: \texttt{\{orderId, method\}} & 
\texttt{200 OK}: Trả về chi tiết thanh toán thành công (hoặc kết quả phát lại). Lỗi: \texttt{400 Bad Request}, \texttt{401 Unauthorized}, \texttt{404 Not Found}, \texttt{409 Conflict} (sai lệch requestHash hoặc trạng thái đơn không hợp lệ). \\"""
    if old_api in c:
        c = replace_or_assert(c, old_api, new_api, "feature-payment: api table", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 5. Update ch8-evaluation.tex
def update_ch8():
    path = 'report/chapters/ch8-evaluation.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_lim = r"\item \textbf{Cơ chế Retry tự động cho Khóa Lạc quan:} Khi xảy ra xung đột phiên bản giữa các request đặt hàng đồng thời, Backend ném mã lỗi \texttt{409 Conflict}. Hiện tại, giao diện người dùng mới dừng ở mức hiển thị thông báo lỗi và yêu cầu khách hàng bấm thử lại thủ công, chưa trang bị cơ chế tự động thử lại ở tầng Client với thuật toán lùi thời gian ngẫu nhiên (\textit{Exponential Backoff with Jitter})."
    new_lim = r"\item \textbf{Gộp chung mã lỗi xung đột tồn kho và phiên bản:} Tại tầng Backend (\texttt{OrdersService}), cả hai trường hợp hết tồn kho thực tế (\texttt{stock < quantity}) và xung đột phiên bản Khóa lạc quan (\texttt{version} không khớp) hiện đang được xử lý chung thông qua ngoại lệ \texttt{400 BadRequestException}. Việc chưa phân tách riêng mã \texttt{409 Conflict} cho trường hợp xung đột phiên bản khiến phía Client chưa thể kích hoạt cơ chế tự động thử lại (Auto-Retry) ngầm mà người dùng phải thao tác lại thủ công."
    c = replace_or_assert(c, old_lim, new_lim, "ch8: limitation 400 vs 409", path)

    old_future = r"\item \textbf{Cơ chế Client-side Auto-Retry:} Nâng cấp lớp thư viện gọi API (API Client) để tự động thử lại các thao tác đặt hàng khi gặp mã lỗi \texttt{409 Conflict} mà không gây phiền toái cho trải nghiệm người dùng."
    new_future = r"\item \textbf{Phân tách mã lỗi 409 Conflict và Cơ chế Client-side Auto-Retry:} Nâng cấp \texttt{OrdersService} để phân tách rõ ràng giữa mã lỗi \texttt{400 Bad Request} (khi hết hàng thực tế) và mã lỗi \texttt{409 Conflict} (khi tồn kho còn nhưng xảy ra xung đột version giữa các request đồng thời), kết hợp xây dựng lớp client tự động thử lại (Retry với Exponential Backoff) giúp nâng cao trải nghiệm người dùng trong các đợt cao điểm."
    c = replace_or_assert(c, old_future, new_future, "ch8: future auto retry", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 6. Update main.tex
def update_main():
    path = 'report/main.tex'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Feature Order in main.tex
    old1 = r"- Xung đột phiên bản (Optimistic Lock Conflict): Báo lỗi \texttt{409 Conflict}, rollback transaction.\newline"
    new1 = r"- Thiếu tồn kho hoặc xung đột phiên bản (Optimistic Lock Conflict): Báo lỗi \texttt{400 Bad Request} (\texttt{\"Insufficient stock or concurrent update...\"}), tự động rollback transaction.\newline"
    c = replace_or_assert(c, old1, new1, "main: feature-order exception flow", path)

    old2 = r"\texttt{201 Created}: Trả về đơn hàng mới tạo với cấu trúc bọc chuẩn \texttt{TransformInterceptor}. Lỗi: \texttt{400}, \texttt{401}, \texttt{409}. \\"
    new2 = r"\texttt{201 Created}: Trả về đơn hàng mới tạo với cấu trúc bọc chuẩn \texttt{TransformInterceptor}. Lỗi: \texttt{400 Bad Request}, \texttt{401 Unauthorized}. \\"
    c = replace_or_assert(c, old2, new2, "main: feature-order api errors", path)

    old3 = r"\texttt{TC-ORD-API-04} & Lỗi & Sai version (Optimistic) & \texttt{POST /orders} & HTTP 409 Conflict, ném lỗi xung đột & Chưa chạy \\"
    new3 = r"\texttt{TC-ORD-API-04} & Lỗi & Xung đột version (Optimistic) & \texttt{POST /orders} & HTTP 400 Bad Request (\"Insufficient stock or concurrent update...\"), rollback & Đạt \\"
    c = replace_or_assert(c, old3, new3, "main: feature-order TC-ORD-API-04", path)

    # Feature Payment in main.tex
    old_flow = r"""5. PaymentsService kiểm tra \texttt{idempotencyKey}:\newline
\quad a. Nếu khóa đã tồn tại trong DB với kết quả thành công: Trả về kết quả trước đó mà không xử lý lại.\newline
\quad b. Nếu khóa đang trong trạng thái xử lý (\texttt{PENDING}): Ném lỗi \texttt{409 Conflict}.\newline
\quad c. Nếu là khóa mới: Tạo bản ghi \texttt{payments} với trạng thái \texttt{PENDING} và lưu mã băm \texttt{requestHash}.\newline"""

    new_flow = r"""5. PaymentsService kiểm tra \texttt{idempotencyKey}:\newline
\quad a. Nếu khóa đã tồn tại trong DB: Gọi \texttt{replayExistingPayment()} đối chiếu mã băm SHA-256 trên \texttt{\{orderId, method\}}. Nếu trùng khớp, trả lại kết quả đã lưu mà không gọi lại Mock Gateway; nếu sai lệch tải trọng, ném ngoại lệ \texttt{409 Conflict}.\newline
\quad b. Nếu là khóa mới: Khởi tạo giao dịch \texttt{payments} trong \texttt{prisma.\$transaction} với trạng thái \texttt{PENDING} và lưu mã băm \texttt{requestHash}.\newline
\quad c. Xử lý tranh chấp đồng thời: Nếu hai request cùng gửi một khóa, lỗi trùng khóa Unique (\texttt{P2002}) được bắt trong khối \texttt{catch}, tự động truy vấn lại giao dịch vừa tạo và phát lại (\textit{replay}) kết quả an toàn.\newline"""
    c = replace_or_assert(c, old_flow, new_flow, "main: feature-payment flow step 5", path)

    old_exc = r"- Trùng Idempotency-Key nhưng khác payload: Báo lỗi \texttt{422 Unprocessable Entity}. \\"
    new_exc = r"- Trùng Idempotency-Key nhưng khác payload: Báo lỗi \texttt{409 Conflict} (\"Idempotency-Key đã được sử dụng với nội dung khác\"). \\"
    c = replace_or_assert(c, old_exc, new_exc, "main: feature-payment payload conflict 409", path)

    old_api = r"""Header: \texttt{Idempotency-Key: <UUID>}, Bearer Token.\newline Body: \texttt{\{orderId, paymentMethod\}} & 
\texttt{200 OK} / \texttt{201 Created}: Trả về chi tiết thanh toán thành công. Lỗi: \texttt{400}, \texttt{401}, \texttt{404}, \texttt{409 Conflict}. \\"""
    new_api = r"""Header: \texttt{Idempotency-Key: <UUID>}, Bearer Token.\newline Body: \texttt{\{orderId, method\}} & 
\texttt{200 OK}: Trả về chi tiết thanh toán thành công (hoặc kết quả phát lại). Lỗi: \texttt{400 Bad Request}, \texttt{401 Unauthorized}, \texttt{404 Not Found}, \texttt{409 Conflict} (sai lệch requestHash hoặc trạng thái đơn không hợp lệ). \\"""
    c = replace_or_assert(c, old_api, new_api, "main: feature-payment api table", path)

    # Ch6 in main.tex
    old_idem = r"""    \item \textbf{Mã hóa toàn vẹn dữ liệu (\texttt{request\_hash}):} Backend nhận request và tính toán mã băm SHA-256 trên nội dung JSON của request body. Mã băm này đại diện cho tính nguyên vẹn của giao dịch.
    \item \textbf{Kiểm tra và Điều phối giao dịch:}
    \begin{itemize}
        \item \textbf{Trường hợp 1 (Trùng lặp thành công - Replay):} Nếu \texttt{idempotency\_key} đã tồn tại trong bảng \texttt{payments} và có trạng thái \texttt{SUCCESS}, hệ thống lập tức trả về kết quả đã lưu trước đó mà không thực hiện gọi sang Mock Gateway.
        \item \textbf{Trường hợp 2 (Xung đột đồng thời - Concurrent Request):} Nếu \texttt{idempotency\_key} đang ở trạng thái \texttt{PENDING} (giao dịch trước đó đang xử lý dở dang), hệ thống lập tức từ chối và ném lỗi \texttt{409 Conflict}.
        \item \textbf{Trường hợp 3 (Sai lệch tải trọng - Payload Tampering):} Nếu \texttt{idempotency\_key} trùng nhưng \texttt{request\_hash} khác nhau (ví dụ cố tình gửi cùng key nhưng đổi số tiền hoặc ID đơn hàng), hệ thống ném lỗi \texttt{422 Unprocessable Entity}.
        \item \textbf{Trường hợp 4 (Giao dịch mới):} Bản ghi thanh toán được tạo với trạng thái \texttt{PENDING}, gọi cổng thanh toán, sau đó cập nhật kết quả cuối cùng.
    \end{itemize}"""

    new_idem = r"""    \item \textbf{Mã hóa toàn vẹn dữ liệu (\texttt{request\_hash}):} Backend nhận request và tính toán mã băm SHA-256 trên chuỗi JSON chứa thông tin đơn hàng và phương thức thanh toán: \texttt{\{ orderId, method \}}. Mã băm này đại diện cho tính toàn vẹn của giao dịch.
    \item \textbf{Kiểm tra và Điều phối giao dịch:}
    \begin{itemize}
        \item \textbf{Trường hợp 1 (Khóa đã tồn tại \& Trùng khớp nội dung):} Nếu \texttt{idempotency\_key} đã tồn tại trong cơ sở dữ liệu và \texttt{request\_hash} trùng khớp, hệ thống gọi hàm \texttt{replayExistingPayment()} để phát lại (\textit{replay}) ngay kết quả thanh toán đã lưu trước đó mà không gọi lại Mock Gateway.
        \item \textbf{Trường hợp 2 (Sai lệch tải trọng - Payload Tampering):} Nếu \texttt{idempotency\_key} đã được sử dụng nhưng \texttt{request\_hash} khác nhau (ví dụ cố tình gửi cùng key nhưng đổi phương thức thanh toán hoặc ID đơn hàng), hệ thống ném ngoại lệ \texttt{409 ConflictException} (\texttt{"Idempotency-Key đã được sử dụng với nội dung khác"}).
        \item \textbf{Trường hợp 3 (Tranh chấp đồng thời - Concurrency Race Condition):} Khi hai request mang cùng một khóa đến gần như đồng thời, cơ sở dữ liệu chặn lại bằng ràng buộc duy nhất (\texttt{@unique}) và trả về mã lỗi \texttt{P2002}. Khối \texttt{catch} ở tầng Service nhận diện mã lỗi \texttt{P2002}, truy vấn lại bản ghi thanh toán vừa được tạo thành công và phát lại (\textit{replay}) kết quả an toàn mà không ném lỗi \texttt{409} hay gây trừ tiền lặp.
        \item \textbf{Trường hợp 4 (Giao dịch mới):} Bản ghi thanh toán được tạo với trạng thái \texttt{PENDING}, gọi cổng thanh toán giả lập, sau đó cập nhật kết quả cuối cùng (\texttt{SUCCESS} hoặc \texttt{FAILED}).
    \end{itemize}"""
    c = replace_or_assert(c, old_idem, new_idem, "main: ch6 idempotency cases", path)

    old_cc = r"""    \item Nếu hai giao dịch đồng thời cùng đọc phiên bản \(version = 0\), giao dịch thứ nhất thực thi thành công sẽ đẩy phiên bản lên \(version = 1\). Giao dịch thứ hai khi cập nhật sẽ nhận số dòng bị ảnh hưởng là 0 (\texttt{affected\_rows = 0}).
    \item Khi phát hiện số dòng cập nhật bằng 0, hệ thống ngay lập tức ném lỗi \texttt{409 ConflictException} ("Sản phẩm vừa có thay đổi, vui lòng thử lại"), đồng thời tự động rollback toàn bộ giao dịch tạo đơn, đảm bảo tồn kho tuyệt đối không bao giờ bị âm."""

    new_cc = r"""    \item Nếu hai giao dịch đồng thời cùng đọc phiên bản \(version = 0\), giao dịch thứ nhất thực thi thành công sẽ đẩy phiên bản lên \(version = 1\). Giao dịch thứ hai khi cập nhật sẽ nhận số dòng bị ảnh hưởng là 0 (\texttt{affected\_rows = 0}).
    \item Khi phát hiện số dòng cập nhật khác 1 (\texttt{result.count !== 1}), hệ thống ngay lập tức ném ngoại lệ \texttt{400 BadRequestException} (\texttt{"Insufficient stock or concurrent update for product <id>."}), đồng thời tự động rollback toàn bộ giao dịch tạo đơn, đảm bảo tồn kho tuyệt đối không bao giờ bị âm."""
    c = replace_or_assert(c, old_cc, new_cc, "main: ch6 concurrency control 400", path)

    # Ch7 in main.tex
    old_code_order = r"""\subsection{Interactive Transaction và Khóa Lạc quan trong OrdersService}
\begin{lstlisting}[language=Java]
// backend/src/modules/orders/orders.service.ts
return await this.prisma.$transaction(async (tx) => {
  for (const item of dto.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stock < item.quantity) {
      throw new BadRequestException(`San pham ${product?.name} khong du ton kho`);
    }

    const updated = await tx.product.updateMany({
      where: { id: item.productId, version: product.version },
      data: {
        stock: { decrement: item.quantity },
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictException('Xung dot ton kho, vui long thu lai');
    }
  }
  // Tiep tuc tao Order va OrderItems trong cung transaction...
});
\end{lstlisting}"""

    new_code_order = r"""\subsection{Interactive Transaction và Khóa Lạc quan trong OrdersService}
\begin{lstlisting}[language=Java]
// backend/src/modules/orders/orders.service.ts
// Product: optimistic locking theo version va ton kho trong tx
for (const [productId, quantity] of productQuantities) {
  const product = productById.get(productId);
  if (!product) {
    throw new BadRequestException(`Product ${productId} is unavailable.`);
  }

  const result = await tx.product.updateMany({
    where: {
      id: productId,
      isAvailable: true,
      version: product.version,
      stock: { gte: quantity },
    },
    data: {
      stock: { decrement: quantity },
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new BadRequestException(
      `Insufficient stock or concurrent update for product ${productId}.`,
    );
  }
}
\end{lstlisting}"""
    c = replace_or_assert(c, old_code_order, new_code_order, "main: ch7 code order", path)

    old_code_pay = r"""\subsection{Kiểm tra Bất biến Idempotency trong PaymentsService}
\begin{lstlisting}[language=Java]
// backend/src/modules/payments/payments.service.ts
const existing = await this.prisma.payment.findUnique({
  where: { idempotencyKey: key },
});

if (existing) {
  if (existing.status === PaymentStatus.SUCCESS) {
    return existing; // Tra ve ngay ket qua da xu ly
  }
  if (existing.status === PaymentStatus.PENDING) {
    throw new ConflictException('Giao dich dang duoc xu ly, vui long cho');
  }
}
\end{lstlisting}"""

    new_code_pay = r"""\subsection{Kiểm tra Bất biến Idempotency và Xử lý Tranh chấp trong PaymentsService}
\begin{lstlisting}[language=Java]
// backend/src/modules/payments/payments.service.ts
// 1. Tinh requestHash tren { orderId, method }
const requestHash = createHash('sha256')
  .update(JSON.stringify({ orderId: body.orderId, method: body.method }))
  .digest('hex');

// 2. Kiem tra key da ton tai: phat lai ket qua da luu (replay)
const existingPayment = await this.prisma.payment.findUnique({
  where: { idempotencyKey: normalizedKey },
  include: { order: true },
});
if (existingPayment) {
  return this.replayExistingPayment(existingPayment, userId, requestHash);
}

// 3. Bat tranh chap dong thoi (Race Condition P2002) de replay an toan
try {
  return await this.prisma.$transaction(async (tx) => {
    // Tao payment voi unique idempotencyKey va requestHash...
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const paymentAfterRace = await this.prisma.payment.findUnique({
      where: { idempotencyKey: normalizedKey },
      include: { order: true },
    });
    if (paymentAfterRace) {
      return this.replayExistingPayment(paymentAfterRace, userId, requestHash);
    }
  }
  throw error;
}
\end{lstlisting}"""
    c = replace_or_assert(c, old_code_pay, new_code_pay, "main: ch7 code payment", path)

    # Ch8 in main.tex
    old_lim = r"\item \textbf{Cơ chế Retry tự động cho Khóa Lạc quan:} Khi xảy ra xung đột phiên bản giữa các request đặt hàng đồng thời, Backend ném mã lỗi \texttt{409 Conflict}. Hiện tại, giao diện người dùng mới dừng ở mức hiển thị thông báo lỗi và yêu cầu khách hàng bấm thử lại thủ công, chưa trang bị cơ chế tự động thử lại ở tầng Client với thuật toán lùi thời gian ngẫu nhiên (\textit{Exponential Backoff with Jitter})."
    new_lim = r"\item \textbf{Gộp chung mã lỗi xung đột tồn kho và phiên bản:} Tại tầng Backend (\texttt{OrdersService}), cả hai trường hợp hết tồn kho thực tế (\texttt{stock < quantity}) và xung đột phiên bản Khóa lạc quan (\texttt{version} không khớp) hiện đang được xử lý chung thông qua ngoại lệ \texttt{400 BadRequestException}. Việc chưa phân tách riêng mã \texttt{409 Conflict} cho trường hợp xung đột phiên bản khiến phía Client chưa thể kích hoạt cơ chế tự động thử lại (Auto-Retry) ngầm mà người dùng phải thao tác lại thủ công."
    c = replace_or_assert(c, old_lim, new_lim, "main: ch8 limitation 400 vs 409", path)

    old_future = r"\item \textbf{Cơ chế Client-side Auto-Retry:} Nâng cấp lớp thư viện gọi API (API Client) để tự động thử lại các thao tác đặt hàng khi gặp mã lỗi \texttt{409 Conflict} mà không gây phiền toái cho trải nghiệm người dùng."
    new_future = r"\item \textbf{Phân tách mã lỗi 409 Conflict và Cơ chế Client-side Auto-Retry:} Nâng cấp \texttt{OrdersService} để phân tách rõ ràng giữa mã lỗi \texttt{400 Bad Request} (khi hết hàng thực tế) và mã lỗi \texttt{409 Conflict} (khi tồn kho còn nhưng xảy ra xung đột version giữa các request đồng thời), kết hợp xây dựng lớp client tự động thử lại (Retry với Exponential Backoff) giúp nâng cao trải nghiệm người dùng trong các đợt cao điểm."
    c = replace_or_assert(c, old_future, new_future, "main: ch8 future auto retry", path)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path}")

# 7. Sync main_full.tex
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
    update_ch7()
    update_feature_order()
    update_feature_payment()
    update_ch8()
    update_main()
    update_main_full()
    print("ALL CODE & REPORT ALIGNMENTS COMPLETED SUCCESSFULLY!")
