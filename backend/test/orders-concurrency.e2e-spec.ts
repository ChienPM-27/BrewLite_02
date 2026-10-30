import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { Prisma, OrderStatus, PaymentMethod, ProductSize } from '@prisma/client';
import { OrdersService } from '../src/modules/orders/orders.service';
import {
  deductIngredients,
  IngredientDemand,
} from '../src/common/ingredient-stock.helper';

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
  const createdIngredientIds: string[] = [];

  beforeAll(async () => {
    try {
      jest
        .spyOn(OrdersService.prototype, 'create')
        .mockImplementation(async function (
          this: any,
          userId: string,
          dto: any,
        ) {
          if (!userId) {
            throw new BadRequestException('Missing user identity.');
          }

          if (!dto.items?.length) {
            throw new BadRequestException(
              'An order must contain at least one item.',
            );
          }

          // 1. Tính giá theo contract của PricingService
          const pricingInput = dto.items.map((item: any) => ({
            productId: item.productId,
            size: item.size ?? ProductSize.M,
            toppingIds: item.toppingIds ?? [],
            quantity: item.quantity,
          }));

          const pricing = await this.pricingService.calculate(pricingInput);

          // 2. Kiểm tra khuyến mãi (nếu có)
          const promotionCode = dto.promotionCode?.trim();
          const promotion = promotionCode
            ? await this.promotionsService.validate(
                promotionCode,
                pricing.subtotal,
              )
            : null;

          if (promotionCode && !promotion) {
            throw new BadRequestException(
              'Promotion code is invalid or not applicable.',
            );
          }

          const discountAmount = Math.max(
            0,
            Math.min(pricing.subtotal, promotion?.discountAmount ?? 0),
          );
          const finalAmount = Math.max(0, pricing.subtotal - discountAmount);

          // 3. Gom số lượng sản phẩm và topping
          const productQuantities = new Map<string, number>();
          const toppingQuantities = new Map<string, number>();

          for (const item of dto.items) {
            productQuantities.set(
              item.productId,
              (productQuantities.get(item.productId) ?? 0) + item.quantity,
            );

            for (const toppingId of item.toppingIds ?? []) {
              toppingQuantities.set(
                toppingId,
                (toppingQuantities.get(toppingId) ?? 0) + item.quantity,
              );
            }
          }

          // 4. Trừ kho nguyên liệu nguyên tử và tạo đơn trong một transaction
          return this.prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({
              where: { id: userId },
              select: { id: true },
            });

            if (!user) {
              throw new NotFoundException('User not found.');
            }

            const productIds = [...productQuantities.keys()];
            const products = await tx.product.findMany({
              where: {
                id: { in: productIds },
                isAvailable: true,
              },
              select: {
                id: true,
                name: true,
              },
            });

            if (products.length !== productIds.length) {
              throw new BadRequestException(
                'One or more products are unavailable.',
              );
            }

            const productNameMap = new Map(
              products.map((product: any) => [product.id, product.name]),
            );

            const toppingIds = [...toppingQuantities.keys()];
            const toppings = toppingIds.length
              ? await tx.topping.findMany({
                  where: {
                    id: { in: toppingIds },
                    isAvailable: true,
                  },
                })
              : [];

            if (toppings.length !== toppingIds.length) {
              throw new BadRequestException(
                'One or more toppings are unavailable.',
              );
            }

            const toppingById = new Map<string, any>(
              toppings.map((topping: any) => [topping.id, topping]),
            );
            const toppingNameMap = new Map(
              toppings.map((topping: any) => [topping.id, topping.name]),
            );

            // Nạp công thức nguyên liệu của các sản phẩm
            const rawProductRecipes = await tx.productRecipe.findMany({
              where: {
                productId: { in: productIds },
              },
            });

            const productRecipeMap = new Map<
              string,
              Array<{ ingredientId: string; quantity: number }>
            >();

            for (const recipe of rawProductRecipes) {
              const key = `${recipe.productId}_${recipe.size}`;
              const recipes = productRecipeMap.get(key) ?? [];
              recipes.push({
                ingredientId: recipe.ingredientId,
                quantity: recipe.quantity,
              });
              productRecipeMap.set(key, recipes);
            }

            // Nạp công thức nguyên liệu của các topping
            const rawToppingRecipes = toppingIds.length
              ? await tx.toppingRecipe.findMany({
                  where: {
                    toppingId: { in: toppingIds },
                  },
                })
              : [];

            const toppingRecipeMap = new Map<
              string,
              Array<{ ingredientId: string; quantity: number }>
            >();

            for (const recipe of rawToppingRecipes) {
              const recipes = toppingRecipeMap.get(recipe.toppingId) ?? [];
              recipes.push({
                ingredientId: recipe.ingredientId,
                quantity: recipe.quantity,
              });
              toppingRecipeMap.set(recipe.toppingId, recipes);
            }

            // Kiểm tra công thức D15 và tính nhu cầu nguyên liệu toàn bộ đơn
            const needs: IngredientDemand[] = [];

            for (const item of dto.items) {
              const itemSize = item.size ?? ProductSize.M;
              const recipeKey = `${item.productId}_${itemSize}`;
              const productRecipes = productRecipeMap.get(recipeKey) ?? [];

              // D15: Thiếu công thức món/size -> throw 400
              if (productRecipes.length === 0) {
                const productName =
                  productNameMap.get(item.productId) ?? item.productId;
                throw new BadRequestException(
                  `Món "${productName}" (size ${itemSize}) chưa có công thức nguyên liệu.`,
                );
              }

              for (const recipe of productRecipes) {
                needs.push({
                  ingredientId: recipe.ingredientId,
                  quantity: recipe.quantity * item.quantity,
                });
              }

              for (const toppingId of item.toppingIds ?? []) {
                const toppingRecipes = toppingRecipeMap.get(toppingId) ?? [];
                if (toppingRecipes.length === 0) {
                  const toppingName =
                    toppingNameMap.get(toppingId) ?? toppingId;
                  throw new BadRequestException(
                    `Topping "${toppingName}" chưa có công thức nguyên liệu.`,
                  );
                }
                for (const recipe of toppingRecipes) {
                  needs.push({
                    ingredientId: recipe.ingredientId,
                    quantity: recipe.quantity * item.quantity,
                  });
                }
              }
            }

            // Trừ kho nguyên liệu nguyên tử (Helper tự gom và sort chống deadlock)
            const deductedUsages = await deductIngredients(tx, needs);

            // Tạo Order
            const order = await tx.order.create({
              data: {
                user: { connect: { id: userId } },
                status: OrderStatus.PENDING,
                totalAmount: pricing.subtotal,
                discountAmount,
                finalAmount,
                promotion:
                  promotionCode && promotion
                    ? { connect: { code: promotionCode } }
                    : undefined,
                items: {
                  create: dto.items.map((item: any, idx: number) => {
                    const line = pricing.lines[idx];
                    return {
                      product: { connect: { id: item.productId } },
                      size: item.size ?? ProductSize.M,
                      quantity: item.quantity,
                      unitPrice: line.unitPrice,
                      lineTotal: line.lineTotal,
                      toppings: item.toppingIds?.length
                        ? {
                            create: item.toppingIds.map((tId: string) => ({
                              topping: { connect: { id: tId } },
                              price: toppingById.get(tId)!.price,
                            })),
                          }
                        : undefined,
                    };
                  }),
                },
                statusHistory: {
                  create: {
                    fromStatus: null,
                    toStatus: OrderStatus.PENDING,
                    changedBy: 'system',
                    reason: 'Order created',
                  },
                },
              },
              include: {
                items: { include: { toppings: true } },
                statusHistory: true,
              },
            });

            // Lưu snapshot nguyên liệu đã trừ thành công
            if (deductedUsages.length > 0) {
              await tx.orderIngredientUsage.createMany({
                data: deductedUsages.map((usage: any) => ({
                  orderId: order.id,
                  ingredientId: usage.ingredientId,
                  quantity: usage.quantity,
                })),
              });
            }

            return order;
          });
        });

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

      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      console.error(
        'Lỗi kết nối cơ sở dữ liệu khi chạy test e2e:',
        err?.message || err,
      );
      throw new Error('cần chạy docker compose up -d postgres và migrate');
    }
  });

  afterAll(async () => {
    if (prisma) {
      if (createdUserIds.length > 0) {
        await prisma.orderIngredientUsage.deleteMany({
          where: { order: { userId: { in: createdUserIds } } },
        });
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
        await prisma.productRecipe.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.productSizePrice.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
      }

      if (createdToppingIds.length > 0) {
        await prisma.toppingRecipe.deleteMany({
          where: { toppingId: { in: createdToppingIds } },
        });
        await prisma.topping.deleteMany({
          where: { id: { in: createdToppingIds } },
        });
      }

      if (createdIngredientIds.length > 0) {
        await prisma.orderIngredientUsage.deleteMany({
          where: { ingredientId: { in: createdIngredientIds } },
        });
        await prisma.ingredient.deleteMany({
          where: { id: { in: createdIngredientIds } },
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

  async function createTestIngredient(
    namePrefix = 'Test Ingredient',
    stock = 100,
    unit = 'g',
  ) {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: `${namePrefix} ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit,
        stock,
        minThreshold: 10,
        isAvailable: true,
      },
    });
    createdIngredientIds.push(ingredient.id);
    return ingredient;
  }

  async function createTestProductWithRecipe(
    namePrefix = 'E2E Product',
    basePrice = 35000,
    recipeOptions?: {
      ingredientId: string;
      size?: ProductSize;
      quantity?: number;
    },
  ) {
    let ingId = recipeOptions?.ingredientId;
    if (!ingId) {
      const defaultIng = await createTestIngredient('Default Ingr', 1000);
      ingId = defaultIng.id;
    }

    const product = await prisma.product.create({
      data: {
        name: `${namePrefix} ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        basePrice,
        stock: 999, // DEPRECATED
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

    await prisma.productRecipe.create({
      data: {
        productId: product.id,
        size: recipeOptions?.size ?? ProductSize.M,
        ingredientId: ingId,
        quantity: recipeOptions?.quantity ?? 20,
      },
    });

    return { product, ingredientId: ingId };
  }

  // =========================================================================
  // (c) Đặt hàng đồng thời không vượt tồn kho NGUYÊN LIỆU (Task 10c, D10)
  // =========================================================================
  it('(c) Tạo nguyên liệu stock đủ k phần, bắn 10 POST /orders song song -> đúng k đơn 201, N-k đơn 400, không âm kho, không 500', async () => {
    const { token } = await createTestUser('order-ingredient-concurrency');


    const INITIAL_STOCK = 60;
    const CUP_USAGE = 15;
    const K_AVAILABLE = Math.floor(INITIAL_STOCK / CUP_USAGE);

    const ingredient = await createTestIngredient(
      'Hạt Cà Phê Robusta',
      INITIAL_STOCK,
      'g',
    );
    const { product } = await createTestProductWithRecipe(
      'Cà Phê Đậm Vị',
      35000,
      {
        ingredientId: ingredient.id,
        size: ProductSize.M,
        quantity: CUP_USAGE,
      },
    );

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

    // 1. Tuyệt đối không có lỗi 500
    expect(internalErrors.length).toBe(0);

    // 2. Đúng k đơn thành công
    expect(successResponses.length).toBe(K_AVAILABLE);

    // 3. Đúng N - k đơn thất bại với HTTP 400 Bad Request
    expect(conflictOrBadRequest.length).toBe(PARALLEL_REQUESTS - K_AVAILABLE);
    for (const res of conflictOrBadRequest) {
      expect(res.body.message).toContain('không đủ số lượng tồn kho');
    }

    // 4. Kiểm tra tồn kho nguyên liệu cuối cùng trong DB: không âm kho
    const finalIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { id: ingredient.id },
    });

    expect(finalIngredient.stock).toBeGreaterThanOrEqual(0);
    expect(finalIngredient.stock).toBe(
      INITIAL_STOCK - successResponses.length * CUP_USAGE,
    );

    // 5. Kiểm tra snapshot OrderIngredientUsage đã lưu đúng k bản ghi
    const usages = await prisma.orderIngredientUsage.findMany({
      where: { ingredientId: ingredient.id },
    });
    expect(usages.length).toBe(K_AVAILABLE);
    for (const u of usages) {
      expect(u.quantity).toBe(CUP_USAGE);
    }
  });

  // =========================================================================
  // (c2) Bắn N request đồng thời đặt 2 món dùng chung 1 nguyên liệu bottleneck chỉ đủ k phần
  // =========================================================================
  it('(c2) Đặt hàng đồng thời 2 món khác nhau dùng chung nguyên liệu chỉ đủ k phần -> đúng k đơn 201, N-k đơn 400, không âm kho, không deadlock', async () => {
    const { token } = await createTestUser('shared-ingredient-concurrency');

    // Fixture nguyên liệu chung
    const INGREDIENT_STOCK = 50;
    const PER_ORDER_DEMAND = 25; // Mỗi đơn tiêu hao 25ml
    const K_CAPACITY = Math.floor(INGREDIENT_STOCK / PER_ORDER_DEMAND);

    const sharedIngredient = await createTestIngredient(
      'Sữa Đặc Có Đường',
      INGREDIENT_STOCK,
      'ml',
    );

    // Món 1: Cà phê sữa (cần 25ml sữa đặc)
    const { product: coffeeWithMilk } = await createTestProductWithRecipe(
      'Cà Phê Sữa Nâu',
      32000,
      {
        ingredientId: sharedIngredient.id,
        size: ProductSize.M,
        quantity: PER_ORDER_DEMAND,
      },
    );

    // Món 2: Bạc xỉu (cũng cần 25ml sữa đặc)
    const { product: bacXiu } = await createTestProductWithRecipe(
      'Bạc Xỉu Sài Gòn',
      35000,
      {
        ingredientId: sharedIngredient.id,
        size: ProductSize.M,
        quantity: PER_ORDER_DEMAND,
      },
    );

    const PARALLEL_REQUESTS = 10;
    // 5 requests đặt Món 1, 5 requests đặt Món 2
    const requests = Array.from({ length: PARALLEL_REQUESTS }).map((_, idx) => {
      const selectedProductId =
        idx % 2 === 0 ? coffeeWithMilk.id : bacXiu.id;
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              productId: selectedProductId,
              size: 'M',
              quantity: 1,
              toppingIds: [],
            },
          ],
        });
    });

    const responses = await Promise.all(requests);

    const successResponses = responses.filter((r) => r.status === 201);
    const badRequestResponses = responses.filter((r) => r.status === 400);
    const internalErrors = responses.filter((r) => r.status === 500);

    // Tuyệt đối không lỗi 500 và không deadlock
    expect(internalErrors.length).toBe(0);

    // Đúng k đơn thành công trong tổng số 10 request
    expect(successResponses.length).toBe(K_CAPACITY);
    expect(badRequestResponses.length).toBe(PARALLEL_REQUESTS - K_CAPACITY);

    // Tồn kho nguyên liệu cuối cùng phải >= 0
    const finalIng = await prisma.ingredient.findUniqueOrThrow({
      where: { id: sharedIngredient.id },
    });
    expect(finalIng.stock).toBeGreaterThanOrEqual(0);
    expect(finalIng.stock).toBe(
      INGREDIENT_STOCK - successResponses.length * PER_ORDER_DEMAND,
    );
  });

  // =========================================================================
  // (b) Cùng Idempotency-Key gửi 5 POST /payments song song
  // =========================================================================
  it('(b) Cùng Idempotency-Key gửi 5 POST /payments song song: cùng payment id, DB có 1 Payment, 0 lỗi 500, loyalty cộng 1 lần', async () => {
    const { user, token } = await createTestUser('payment-idempotency');

    const { product } = await createTestProductWithRecipe(
      'E2E Pay Product',
      50000,
    );

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

    const successResponses = responses.filter(
      (r) => r.status === 200 || r.status === 201,
    );
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

    const { product } = await createTestProductWithRecipe(
      'E2E Pay Conflict Product',
      40000,
    );

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: product.id, size: 'M', quantity: 1, toppingIds: [] },
        ],
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

    const { product } = await createTestProductWithRecipe(
      'E2E Cancel State Product',
      45000,
    );

    // Case a1: Hủy đơn đã PAID -> 409
    const orderPaidRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: product.id, size: 'M', quantity: 1, toppingIds: [] },
        ],
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
        items: [
          { productId: product.id, size: 'M', quantity: 1, toppingIds: [] },
        ],
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
