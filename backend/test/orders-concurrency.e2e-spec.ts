import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { Prisma, OrderStatus, PaymentMethod } from '@prisma/client';

(Prisma.Decimal.prototype as any).toJSON = function () {
  return this.toNumber();
};

describe('Orders & Payments Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdToppingIds: string[] = [];

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalInterceptors(new TransformInterceptor());
      app.useGlobalFilters(new AllExceptionsFilter());

      await app.init();

      (app.getHttpServer() as any).setMaxListeners?.(50);

      prisma = app.get(PrismaService);
      jwtService = app.get(JwtService);

      // Kiểm tra kết nối DB thật, nếu lỗi thì thông báo rõ ràng
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      console.error('Lỗi kết nối cơ sở dữ liệu khi chạy test e2e:', err?.message || err);
      throw new Error('cần chạy docker compose up -d postgres và migrate');
    }
  });

  afterAll(async () => {
    if (prisma) {
      // Dọn dẹp dữ liệu test tự tạo, không đụng dữ liệu seed dùng chung
      if (createdUserIds.length > 0) {
        await prisma.orderItemTopping.deleteMany({
          where: { orderItem: { order: { userId: { in: createdUserIds } } } },
        });
        await prisma.orderItem.deleteMany({
          where: { order: { userId: { in: createdUserIds } } },
        });
        await prisma.payment.deleteMany({
          where: { order: { userId: { in: createdUserIds } } },
        });
        await prisma.orderStatusHistory.deleteMany({
          where: { order: { userId: { in: createdUserIds } } },
        });
        await prisma.loyaltyTransaction.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.order.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }

      if (createdProductIds.length > 0) {
        await prisma.productSizePrice.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
      }

      if (createdToppingIds.length > 0) {
        await prisma.topping.deleteMany({
          where: { id: { in: createdToppingIds } },
        });
      }
    }

    if (app) {
      await app.close();
    }
  });

  async function createTestUser(emailPrefix = 'user-e2e') {
    const user = await prisma.user.create({
      data: {
        email: `${emailPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@brewlite.test`,
        passwordHash: 'dummy_hash',
        fullName: 'E2E Test User',
        loyaltyPoints: 0,
      },
    });
    createdUserIds.push(user.id);
    const token = jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }

  // =========================================================================
  // (c) Đặt hàng đồng thời không vượt tồn kho Product (Optimistic Locking)
  // =========================================================================
  it('(c) Tạo product stock = 3, bắn 10 POST /orders song song, mỗi đơn quantity 1 -> 201 <= 3, tồn kho cuối >= 0, không có 500', async () => {
    const { token } = await createTestUser('order-concurrency');

    const product = await prisma.product.create({
      data: {
        name: `E2E Product ${Date.now()}`,
        basePrice: 35000,
        stock: 3,
        version: 0,
        isAvailable: true,
        sizePrices: {
          create: [
            { size: 'S', priceAdjustment: 0 },
            { size: 'M', priceAdjustment: 5000 },
            { size: 'L', priceAdjustment: 10000 },
          ],
        },
      },
    });
    createdProductIds.push(product.id);

    const PARALLEL_REQUESTS = 10;
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

    const requests = Array.from({ length: PARALLEL_REQUESTS }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderPayload),
    );

    const responses = await Promise.all(requests);

    const successResponses = responses.filter((r) => r.status === 201);
    const conflictOrBadRequest = responses.filter((r) => r.status === 400);
    const internalErrors = responses.filter((r) => r.status === 500);

    // Không có lỗi 500
    expect(internalErrors.length).toBe(0);

    // Số đơn tạo thành công <= 3 (tồn kho ban đầu)
    expect(successResponses.length).toBeLessThanOrEqual(3);
    expect(successResponses.length).toBeGreaterThan(0);

    // Tất cả request thất bại phải là 400 Bad Request
    expect(successResponses.length + conflictOrBadRequest.length).toBe(PARALLEL_REQUESTS);

    // Tồn kho cuối cùng trong DB
    const finalProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
    expect(finalProduct.stock).toBe(3 - successResponses.length);
  });

  // =========================================================================
  // (c2) Đặt hàng đồng thời không vượt tồn kho Topping
  // =========================================================================
  it('(c2) Tạo topping stock = 2, bắn 10 POST /orders song song có topping -> 201 <= 2, tồn kho cuối >= 0, không có 500', async () => {
    const { token } = await createTestUser('topping-concurrency');

    const product = await prisma.product.create({
      data: {
        name: `E2E Product Topping Test ${Date.now()}`,
        basePrice: 30000,
        stock: 50, // Nhiều để không bị chặn bởi product
        version: 0,
        isAvailable: true,
        sizePrices: {
          create: [
            { size: 'M', priceAdjustment: 0 },
          ],
        },
      },
    });
    createdProductIds.push(product.id);

    const topping = await prisma.topping.create({
      data: {
        name: `E2E Topping ${Date.now()}`,
        price: 8000,
        stock: 2,
        isAvailable: true,
      },
    });
    createdToppingIds.push(topping.id);

    const PARALLEL_REQUESTS = 10;
    const orderPayload = {
      items: [
        {
          productId: product.id,
          size: 'M',
          quantity: 1,
          toppingIds: [topping.id],
        },
      ],
    };

    const requests = Array.from({ length: PARALLEL_REQUESTS }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderPayload),
    );

    const responses = await Promise.all(requests);

    const successResponses = responses.filter((r) => r.status === 201);
    const internalErrors = responses.filter((r) => r.status === 500);

    // Không có lỗi 500
    expect(internalErrors.length).toBe(0);

    // Số đơn tạo thành công <= 2 (tồn kho topping ban đầu)
    expect(successResponses.length).toBeLessThanOrEqual(2);
    expect(successResponses.length).toBeGreaterThan(0);

    // Tồn kho topping cuối cùng trong DB
    const finalTopping = await prisma.topping.findUniqueOrThrow({
      where: { id: topping.id },
    });

    expect(finalTopping.stock).toBeGreaterThanOrEqual(0);
    expect(finalTopping.stock).toBe(2 - successResponses.length);
  });

  // =========================================================================
  // (b) Cùng Idempotency-Key gửi 5 POST /payments song song
  // =========================================================================
  it('(b) Cùng Idempotency-Key gửi 5 POST /payments song song: cùng payment id, DB có 1 Payment, 0 lỗi 500, loyalty cộng 1 lần', async () => {
    const { user, token } = await createTestUser('payment-idempotency');

    const product = await prisma.product.create({
      data: {
        name: `E2E Pay Product ${Date.now()}`,
        basePrice: 50000,
        stock: 10,
        version: 0,
        isAvailable: true,
        sizePrices: {
          create: [{ size: 'M', priceAdjustment: 0 }],
        },
      },
    });
    createdProductIds.push(product.id);

    // Tạo order PENDING
    const createOrderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            productId: product.id,
            size: 'M',
            quantity: 1,
            toppingIds: [],
          },
        ],
      });

    expect(createOrderRes.status).toBe(201);
    const orderId = createOrderRes.body.data.id;

    const idempotencyKey = `e2e-pay-idem-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const CONCURRENT_PAYMENTS = 5;

    const paymentPayload = {
      orderId,
      method: PaymentMethod.E_WALLET,
    };

    const requests = Array.from({ length: CONCURRENT_PAYMENTS }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .set('x-mock-outcome', 'SUCCESS')
        .send(paymentPayload),
    );

    const responses = await Promise.all(requests);

    const internalErrors = responses.filter((r) => r.status === 500);
    expect(internalErrors.length).toBe(0);

    const successResponses = responses.filter((r) => r.status === 200 || r.status === 201);
    expect(successResponses.length).toBe(CONCURRENT_PAYMENTS);

    // Tất cả trả về cùng 1 payment id
    const paymentIds = new Set(successResponses.map((r) => r.body.data.id));
    expect(paymentIds.size).toBe(1);

    // Kiểm tra DB chỉ có đúng 1 bản ghi Payment cho key này
    const dbPayments = await prisma.payment.findMany({
      where: { idempotencyKey },
    });
    expect(dbPayments.length).toBe(1);

    // Loyalty points chỉ được cộng 1 lần cho đơn hàng này
    const loyaltyTxs = await prisma.loyaltyTransaction.findMany({
      where: { orderId },
    });
    expect(loyaltyTxs.length).toBe(1);

    // Điểm user cập nhật đúng bằng points của 1 transaction
    const finalUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(finalUser.loyaltyPoints).toBe(loyaltyTxs[0].points);
  });

  // =========================================================================
  // (b2) Cùng key nhưng body khác (method khác) trả 409 Conflict
  // =========================================================================
  it('(b2) Cùng key nhưng body khác (method khác) trả 409 Conflict', async () => {
    const { token } = await createTestUser('payment-hash-conflict');

    const product = await prisma.product.create({
      data: {
        name: `E2E Pay Conflict Product ${Date.now()}`,
        basePrice: 40000,
        stock: 10,
        version: 0,
        isAvailable: true,
        sizePrices: {
          create: [{ size: 'M', priceAdjustment: 0 }],
        },
      },
    });
    createdProductIds.push(product.id);

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, size: 'M', quantity: 1, toppingIds: [] }],
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    const idempotencyKey = `e2e-pay-hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Lần 1: gửi method E_WALLET
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .set('x-mock-outcome', 'SUCCESS')
      .send({ orderId, method: PaymentMethod.E_WALLET });
    expect([200, 201]).toContain(res1.status);

    // Lần 2: cùng key nhưng đổi method sang BANK_CARD
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .set('x-mock-outcome', 'SUCCESS')
      .send({ orderId, method: PaymentMethod.BANK_CARD });

    expect(res2.status).toBe(409);
    expect(res2.body.message).toContain('Idempotency-Key');
  });

  // =========================================================================
  // (a) Chuyển trạng thái sai qua API: hủy đơn đã PAID trả 409; hủy 2 lần trả 409
  // =========================================================================
  it('(a) Chuyển trạng thái sai qua API: hủy đơn đã PAID trả 409; hủy 2 lần trả 409', async () => {
    const { token } = await createTestUser('cancel-state-machine');

    const product = await prisma.product.create({
      data: {
        name: `E2E Cancel State Product ${Date.now()}`,
        basePrice: 45000,
        stock: 10,
        version: 0,
        isAvailable: true,
        sizePrices: {
          create: [{ size: 'M', priceAdjustment: 0 }],
        },
      },
    });
    createdProductIds.push(product.id);

    // Case a1: Hủy đơn đã PAID -> 409
    const orderPaidRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, size: 'M', quantity: 1, toppingIds: [] }],
      });
    expect(orderPaidRes.status).toBe(201);
    const paidOrderId = orderPaidRes.body.data.id;

    // Thanh toán đơn hàng thành PAID
    const payRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-paid-${Date.now()}`)
      .set('x-mock-outcome', 'SUCCESS')
      .send({ orderId: paidOrderId, method: PaymentMethod.E_WALLET });
    expect([200, 201]).toContain(payRes.status);

    // Cố gắng hủy đơn đã PAID
    const cancelPaidRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${paidOrderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(cancelPaidRes.status).toBe(409);

    // Case a2: Hủy đơn 2 lần -> lần 1 thành công (200), lần 2 trả 409
    const orderPendingRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, size: 'M', quantity: 1, toppingIds: [] }],
      });
    expect(orderPendingRes.status).toBe(201);
    const pendingOrderId = orderPendingRes.body.data.id;

    // Hủy lần 1: thành công
    const cancel1Res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${pendingOrderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancel1Res.status).toBe(200);
    expect(cancel1Res.body.data.status).toBe(OrderStatus.CANCELLED);

    // Hủy lần 2: trả 409 Conflict
    const cancel2Res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${pendingOrderId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancel2Res.status).toBe(409);
  });
});
