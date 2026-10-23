import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
    };
  };
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@brewlite.test',
      password: 'Demo@12345',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Đăng nhập thất bại (${res.status}): ${errorText}`);
  }

  const json = (await res.json()) as LoginResponse;
  return json.data.accessToken;
}

async function testOrderConcurrency(token: string) {
  console.log(
    '\n--- [TEST 1] KIỂM TRA ĐẶT HÀNG ĐỒNG THỜI (OPTIMISTIC LOCKING) ---',
  );

  // Tìm sản phẩm test 'Bạc xỉu' hoặc sản phẩm đầu tiên
  const product = await prisma.product.findFirst({
    where: { name: 'Bạc xỉu' },
  });

  if (!product) {
    throw new Error('Không tìm thấy sản phẩm test trong DB');
  }

  const originalStock = product.stock;
  console.log(`Sản phẩm test: "${product.name}" (ID: ${product.id})`);
  console.log(`Tồn kho ban đầu: ${originalStock}, Version: ${product.version}`);

  // Cố tình đặt tồn kho = 1 để thử nghiệm tranh chấp
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: 1 },
  });

  const updatedProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  console.log(
    `Đã reset tồn kho = ${updatedProduct.stock}, Version = ${updatedProduct.version}`,
  );

  const CONCURRENT_REQUESTS = 10;
  console.log(
    `Bắn đồng thời ${CONCURRENT_REQUESTS} requests POST /orders (mỗi đơn mua 1 ly size M)...`,
  );

  const orderPayload = {
    items: [
      {
        productId: product.id,
        size: 'M',
        quantity: 1,
        toppingIds: [],
      },
    ],
  };

  const start = Date.now();
  const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(
    async (_, idx) => {
      try {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderPayload),
        });
        const data = await res.json();
        return { index: idx + 1, status: res.status, data };
      } catch (err: any) {
        return { index: idx + 1, status: 500, error: err.message };
      }
    },
  );

  const results = await Promise.all(requests);
  const elapsed = Date.now() - start;

  const successResults = results.filter((r) => r.status === 201);
  const conflictOrFailedResults = results.filter((r) => r.status === 400);
  const otherResults = results.filter(
    (r) => r.status !== 201 && r.status !== 400,
  );

  console.log(`Thời gian thực thi: ${elapsed}ms`);
  console.log(`- Đơn tạo thành công (201 Created): ${successResults.length}`);
  console.log(
    `- Đơn bị chặn hết hàng/xung đột (400 Bad Request): ${conflictOrFailedResults.length}`,
  );
  if (otherResults.length > 0) {
    console.log(`- Các lỗi khác: ${otherResults.length}`, otherResults);
  }

  // Kiểm tra tồn kho và version trong DB
  const finalProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  console.log(
    `Tồn kho cuối cùng trong DB: ${finalProduct.stock} (Version: ${finalProduct.version})`,
  );

  // Phục hồi lại tồn kho ban đầu
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: originalStock },
  });
  console.log(`Đã khôi phục tồn kho sản phẩm về ${originalStock}.`);

  if (successResults.length !== 1) {
    throw new Error(
      `Thất bại: Kỳ vọng chính xác 1 đơn thành công, nhưng có ${successResults.length} đơn thành công!`,
    );
  }

  if (finalProduct.stock < 0) {
    throw new Error(`Thất bại: Tồn kho bị âm (${finalProduct.stock})!`);
  }

  if (finalProduct.stock !== 0) {
    throw new Error(
      `Thất bại: Tồn kho kỳ vọng là 0 nhưng là ${finalProduct.stock}!`,
    );
  }

  console.log(
    '✅ PASS [TEST 1]: Optimistic locking chặn tranh chấp thành công, không vượt tồn kho.',
  );
}

async function testPaymentConcurrency(token: string) {
  console.log(
    '\n--- [TEST 2] KIỂM TRA THANH TOÁN ĐỒNG THỜI CÙNG IDEMPOTENCY-KEY ---',
  );

  // Lấy sản phẩm còn hàng
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 5 } },
  });
  if (!product) {
    throw new Error('Không có sản phẩm nào đủ tồn kho để tạo đơn test payment');
  }

  // Tạo 1 đơn mới ở trạng thái PENDING
  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        {
          productId: product.id,
          size: 'M',
          quantity: 1,
          toppingIds: [],
        },
      ],
    }),
  });

  if (!createOrderRes.ok) {
    throw new Error(
      `Không tạo được đơn hàng test payment: ${await createOrderRes.text()}`,
    );
  }

  const orderJson = await createOrderRes.json();
  const orderId = orderJson.data.id;
  console.log(`Đã tạo đơn hàng test payment: ID = ${orderId}`);

  const idempotencyKey = `concurrency-pay-${Date.now()}`;
  const CONCURRENT_PAYMENTS = 5;
  console.log(
    `Bắn đồng thời ${CONCURRENT_PAYMENTS} requests POST /payments cùng key "${idempotencyKey}"...`,
  );

  const paymentPayload = {
    orderId,
    method: 'E_WALLET',
  };

  const paymentRequests = Array.from({ length: CONCURRENT_PAYMENTS }).map(
    async (_, idx) => {
      try {
        const res = await fetch(`${BASE_URL}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(paymentPayload),
        });
        const data = await res.json();
        return { index: idx + 1, status: res.status, data };
      } catch (err: any) {
        return { index: idx + 1, status: 500, error: err.message };
      }
    },
  );

  const paymentResults = await Promise.all(paymentRequests);
  const successPayments = paymentResults.filter(
    (r) => r.status === 200 || r.status === 201,
  );
  const error500Payments = paymentResults.filter((r) => r.status === 500);

  console.log(`- Số request thành công (200/201): ${successPayments.length}`);
  console.log(`- Số request bị lỗi 500: ${error500Payments.length}`);

  if (error500Payments.length > 0) {
    throw new Error(
      `Thất bại: Có request bị lỗi 500 khi tranh chấp Idempotency-Key!`,
    );
  }

  if (successPayments.length !== CONCURRENT_PAYMENTS) {
    throw new Error(
      `Thất bại: Tất cả các request đồng thời cùng key phải trả về 200/201 (kết quả đã thanh toán), nhưng chỉ có ${successPayments.length}/${CONCURRENT_PAYMENTS}`,
    );
  }

  // Kiểm tra tất cả kết quả trả về cùng 1 payment id
  const paymentIds = new Set(successPayments.map((r) => r.data?.data?.id));
  console.log(`- Số payment ID phân biệt trả về: ${paymentIds.size}`);
  if (paymentIds.size !== 1) {
    throw new Error(
      `Thất bại: Các request trả về các payment ID khác nhau: ${Array.from(paymentIds)}`,
    );
  }

  // Kiểm tra DB chỉ có đúng 1 bản ghi payment
  const dbPaymentsCount = await prisma.payment.count({
    where: { idempotencyKey },
  });
  console.log(`- Số bản ghi Payment trong DB với key này: ${dbPaymentsCount}`);

  if (dbPaymentsCount !== 1) {
    throw new Error(
      `Thất bại: DB có ${dbPaymentsCount} bản ghi Payment cho cùng 1 idempotency key!`,
    );
  }

  console.log(
    '✅ PASS [TEST 2]: Idempotency xử lý tranh chấp đồng thời an toàn, đúng 1 bản ghi thanh toán.',
  );
}

async function main() {
  console.log(
    '================================================================',
  );
  console.log(
    '   BREWLITE - CONCURRENCY & RACE CONDITIONS TEST SUITE (GD1-12)',
  );
  console.log(`   Target: ${BASE_URL}`);
  console.log(
    '================================================================',
  );

  try {
    // 1. Kiểm tra kết nối server
    const healthRes = await fetch(`${BASE_URL}/health`).catch(() => null);
    if (!healthRes || !healthRes.ok) {
      console.error(
        `❌ Lỗi: Không kết nối được tới server tại ${BASE_URL}. Vui lòng khởi động server (npm run start:dev) trước khi chạy test.`,
      );
      process.exit(1);
    }

    console.log('Đã kết nối tới API server thành công.');

    // 2. Đăng nhập
    const token = await login();
    console.log('Đăng nhập thành công, đã nhận JWT token.');

    // 3. Chạy test
    await testOrderConcurrency(token);
    await testPaymentConcurrency(token);

    console.log(
      '\n================================================================',
    );
    console.log(
      '🎉 TẤT CẢ KỊCH BẢN KIỂM THỬ ĐỒNG THỜI (CONCURRENCY) ĐÃ VƯỢT QUA!',
    );
    console.log(
      '================================================================\n',
    );
  } catch (error: any) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
