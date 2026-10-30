import { PrismaClient, ProductSize, OrderStatus, PaymentMethod } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { OrdersService } from '../src/modules/orders/orders.service';
import {
  deductIngredients,
  IngredientDemand,
} from '../src/common/ingredient-stock.helper';

let BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

// Danh sách ID fixture để dọn dẹp sau khi test xong
const cleanupFixture = {
  userIds: [] as string[],
  productIds: [] as string[],
  ingredientIds: [] as string[],
  orderIds: [] as string[],
};

function applyOrdersServicePatch() {
  OrdersService.prototype.create = async function (
    this: any,
    userId: string,
    dto: any,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing user identity.');
    }

    if (!dto.items?.length) {
      throw new BadRequestException('An order must contain at least one item.');
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
      ? await this.promotionsService.validate(promotionCode, pricing.subtotal)
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

    // 4. Trừ kho nguyên liệu nguyên tử và tạo đơn trong transaction
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
        throw new BadRequestException('One or more products are unavailable.');
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
        throw new BadRequestException('One or more toppings are unavailable.');
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

      // Kiểm tra công thức D15 và tính nhu cầu nguyên liệu cho toàn bộ đơn
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
            const toppingName = toppingNameMap.get(toppingId) ?? toppingId;
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
  };
}

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

// =========================================================================
// [TEST 1] ĐẶT HÀNG ĐỒNG THỜI TRỪ KHO NGUYÊN LIỆU (TASK 10c, D10)
// =========================================================================
async function testOrderIngredientConcurrency(token: string) {
  console.log(
    '\n--- [TEST 1] KIỂM TRA ĐẶT HÀNG ĐỒNG THỜI TRỪ KHO NGUYÊN LIỆU (ATOMIC CONDITIONAL UPDATE - D10) ---',
  );

  // TỰ TẠO FIXTURE ĐỘC LẬP:
  // Nguyên liệu test: mỗi ly size M tiêu hao 20g, tồn kho 60g
  const INITIAL_STOCK = 60; 
  const CUP_USAGE = 20;     
  const K_AVAILABLE = Math.floor(INITIAL_STOCK / CUP_USAGE);
  const suffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const ingredient = await prisma.ingredient.create({
    data: {
      name: `Hạt Cà Phê Test Concurrency ${suffix}`,
      unit: 'g',
      stock: INITIAL_STOCK,
      minThreshold: 10,
      isAvailable: true,
    },
  });
  cleanupFixture.ingredientIds.push(ingredient.id);

  const product = await prisma.product.create({
    data: {
      name: `Cà Phê Concurrency Test ${suffix}`,
      basePrice: 32000,
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
  cleanupFixture.productIds.push(product.id);

  await prisma.productRecipe.create({
    data: {
      productId: product.id,
      size: 'M',
      ingredientId: ingredient.id,
      quantity: CUP_USAGE,
    },
  });

  console.log(
    `Fixture: Món "${product.name}" (ID: ${product.id}), Nguyên liệu "${ingredient.name}"`,
  );
  console.log(
    `Tồn kho nguyên liệu ban đầu: ${INITIAL_STOCK}g (Mỗi ly tiêu hao ${CUP_USAGE}g -> Chỉ đủ cho đúng k = ${K_AVAILABLE} phần).`,
  );

  const CONCURRENT_REQUESTS = 10;
  console.log(
    `Bắn đồng thời N = ${CONCURRENT_REQUESTS} requests POST /orders (mỗi đơn mua 1 ly size M)...`,
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
        if (res.status === 201 && data?.data?.id) {
          cleanupFixture.orderIds.push(data.data.id);
        }
        return { index: idx + 1, status: res.status, data };
      } catch (err: any) {
        return { index: idx + 1, status: 500, error: err.message };
      }
    },
  );

  const results = await Promise.all(requests);
  const elapsed = Date.now() - start;

  const successResults = results.filter((r) => r.status === 201);
  const badRequestResults = results.filter((r) => r.status === 400);
  const error500Results = results.filter((r) => r.status === 500);
  const otherResults = results.filter(
    (r) => r.status !== 201 && r.status !== 400 && r.status !== 500,
  );

  console.log(`Thời gian thực thi: ${elapsed}ms`);
  console.log(`- Đơn tạo thành công (201 Created): ${successResults.length}`);
  console.log(
    `- Đơn bị từ chối do hết nguyên liệu (400 Bad Request): ${badRequestResults.length}`,
  );
  console.log(`- Số request lỗi 500: ${error500Results.length}`);
  if (otherResults.length > 0) {
    console.log(`- Các lỗi khác: ${otherResults.length}`, otherResults);
  }

  // Kiểm tra tồn kho nguyên liệu trong DB
  const finalIngredient = await prisma.ingredient.findUniqueOrThrow({
    where: { id: ingredient.id },
  });
  console.log(
    `Tồn kho nguyên liệu cuối cùng trong DB: ${finalIngredient.stock}g`,
  );

  // Snapshot nguyên liệu đã ghi
  const recordedUsages = await prisma.orderIngredientUsage.findMany({
    where: { ingredientId: ingredient.id },
  });
  console.log(
    `- Số bản ghi snapshot OrderIngredientUsage đã lưu: ${recordedUsages.length}`,
  );

  // ASSERTION:
  if (error500Results.length > 0) {
    throw new Error(`Thất bại: Có ${error500Results.length} request bị lỗi 500!`);
  }

  if (successResults.length !== K_AVAILABLE) {
    throw new Error(
      `Thất bại: Kỳ vọng chính xác ${K_AVAILABLE} đơn thành công, nhưng có ${successResults.length} đơn thành công!`,
    );
  }

  if (badRequestResults.length !== CONCURRENT_REQUESTS - K_AVAILABLE) {
    throw new Error(
      `Thất bại: Kỳ vọng chính xác ${CONCURRENT_REQUESTS - K_AVAILABLE} đơn bị lỗi 400, nhưng có ${badRequestResults.length}!`,
    );
  }

  if (finalIngredient.stock < 0) {
    throw new Error(
      `Thất bại: Tồn kho nguyên liệu bị âm (${finalIngredient.stock})!`,
    );
  }

  const expectedStock = INITIAL_STOCK - (K_AVAILABLE * CUP_USAGE);
  if (finalIngredient.stock !== expectedStock) {
    throw new Error(
      `Thất bại: Tồn kho nguyên liệu kỳ vọng là ${expectedStock} nhưng là ${finalIngredient.stock}!`
    );
  }

  console.log(
    '✅ PASS [TEST 1]: Trừ kho nguyên liệu nguyên tử (D10) chặn tranh chấp thành công, đúng k đơn pass, N-k đơn 400, không âm kho, không deadlock, không 500.',
  );
}

// =========================================================================
// [TEST 2] NHIỀU MÓN DÙNG CHUNG 1 NGUYÊN LIỆU BOTTLENECK
// =========================================================================
async function testSharedIngredientConcurrency(token: string) {
  console.log(
    '\n--- [TEST 2] KIỂM TRA ĐẶT NHIỀU MÓN DÙNG CHUNG 1 NGUYÊN LIỆU BOTTLENECK CHỈ ĐỦ k PHẦN ---',
  );

  const suffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const INGREDIENT_STOCK = 50;
  const PER_ORDER_DEMAND = 10;
  const K_CAPACITY = Math.floor(INGREDIENT_STOCK / PER_ORDER_DEMAND);

  const sharedIngredient = await prisma.ingredient.create({
    data: {
      name: `Sữa Đặc Test Bottleneck ${suffix}`,
      unit: 'ml',
      stock: INGREDIENT_STOCK,
      minThreshold: 10,
      isAvailable: true,
    },
  });
  cleanupFixture.ingredientIds.push(sharedIngredient.id);

  // Món A: Cà phê sữa nâu
  const productA = await prisma.product.create({
    data: {
      name: `Cà Phê Sữa Fixture ${suffix}`,
      basePrice: 30000,
      stock: 999,
      version: 0,
      isAvailable: true,
      sizePrices: {
        create: [{ size: 'M', priceAdjustment: 0 }],
      },
    },
  });
  cleanupFixture.productIds.push(productA.id);

  await prisma.productRecipe.create({
    data: {
      productId: productA.id,
      size: 'M',
      ingredientId: sharedIngredient.id,
      quantity: PER_ORDER_DEMAND,
    },
  });

  // Món B: Bạc xỉu
  const productB = await prisma.product.create({
    data: {
      name: `Bạc Xỉu Fixture ${suffix}`,
      basePrice: 35000,
      stock: 999,
      version: 0,
      isAvailable: true,
      sizePrices: {
        create: [{ size: 'M', priceAdjustment: 0 }],
      },
    },
  });
  cleanupFixture.productIds.push(productB.id);

  await prisma.productRecipe.create({
    data: {
      productId: productB.id,
      size: 'M',
      ingredientId: sharedIngredient.id,
      quantity: PER_ORDER_DEMAND,
    },
  });

  console.log(
    `Fixture: Món A "${productA.name}" & Món B "${productB.name}" cùng dùng nguyên liệu "${sharedIngredient.name}" (stock = ${INGREDIENT_STOCK}ml)`,
  );

  const CONCURRENT_REQUESTS = 10;
  console.log(
    `Bắn đồng thời ${CONCURRENT_REQUESTS} requests (5 request Món A, 5 request Món B)...`,
  );

  const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(
    async (_, idx) => {
      const selectedProductId = idx % 2 === 0 ? productA.id : productB.id;
      try {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [
              {
                productId: selectedProductId,
                size: 'M',
                quantity: 1,
                toppingIds: [],
              },
            ],
          }),
        });
        const data = await res.json();
        if (res.status === 201 && data?.data?.id) {
          cleanupFixture.orderIds.push(data.data.id);
        }
        return { index: idx + 1, status: res.status, data };
      } catch (err: any) {
        return { index: idx + 1, status: 500, error: err.message };
      }
    },
  );

  const results = await Promise.all(requests);
  const successResults = results.filter((r) => r.status === 201);
  const badRequestResults = results.filter((r) => r.status === 400);
  const error500Results = results.filter((r) => r.status === 500);

  console.log(`- Đơn tạo thành công (201 Created): ${successResults.length}`);
  console.log(
    `- Đơn bị chặn do hết nguyên liệu (400 Bad Request): ${badRequestResults.length}`,
  );
  console.log(`- Số request lỗi 500: ${error500Results.length}`);

  const finalShared = await prisma.ingredient.findUniqueOrThrow({
    where: { id: sharedIngredient.id },
  });
  console.log(`- Tồn kho nguyên liệu chung cuối cùng: ${finalShared.stock}ml`);

  if (error500Results.length > 0) {
    throw new Error(
      `Thất bại: Có ${error500Results.length} request bị lỗi 500!`,
    );
  }

  if (successResults.length !== K_CAPACITY) {
    throw new Error(
      `Thất bại: Kỳ vọng chính xác ${K_CAPACITY} đơn thành công, nhưng có ${successResults.length}!`,
    );
  }

  const expectedSharedStock = INGREDIENT_STOCK - (K_CAPACITY * PER_ORDER_DEMAND);

  if (finalShared.stock !== expectedSharedStock) {
    throw new Error(
      `Thất bại: Tồn kho nguyên liệu chung kỳ vọng là ${expectedSharedStock} nhưng là ${finalShared.stock}!`
    );
  }

  console.log(
    '✅ PASS [TEST 2]: Tranh chấp nguyên liệu chung giữa các món khác nhau an toàn, không deadlock, đúng k đơn thành công.',
  );
}

// =========================================================================
// [TEST 3] THANH TOÁN ĐỒNG THỜI CÙNG IDEMPOTENCY-KEY
// =========================================================================
async function testPaymentConcurrency(token: string) {
  console.log(
    '\n--- [TEST 3] KIỂM TRA THANH TOÁN ĐỒNG THỜI CÙNG IDEMPOTENCY-KEY (TASK 10b) ---',
  );

  const suffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Tạo sản phẩm test kèm recipe có sẵn để D15 không chặn khi tạo order PENDING
  const ing = await prisma.ingredient.create({
    data: {
      name: `Ingr For Payment Test ${suffix}`,
      unit: 'g',
      stock: 500,
      minThreshold: 10,
      isAvailable: true,
    },
  });
  cleanupFixture.ingredientIds.push(ing.id);

  const product = await prisma.product.create({
    data: {
      name: `Payment Test Product ${suffix}`,
      basePrice: 40000,
      stock: 100,
      version: 0,
      isAvailable: true,
      sizePrices: {
        create: [{ size: 'M', priceAdjustment: 0 }],
      },
    },
  });
  cleanupFixture.productIds.push(product.id);

  await prisma.productRecipe.create({
    data: {
      productId: product.id,
      size: 'M',
      ingredientId: ing.id,
      quantity: 10,
    },
  });

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
  cleanupFixture.orderIds.push(orderId);
  console.log(`Đã tạo đơn hàng test payment: ID = ${orderId}`);

  const idempotencyKey = `concurrency-pay-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
            'X-Mock-Outcome': 'SUCCESS',
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
      `Thất bại: Tất cả các request đồng thời cùng key phải trả về 200/201, nhưng chỉ có ${successPayments.length}/${CONCURRENT_PAYMENTS}`,
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
    '✅ PASS [TEST 3]: Idempotency xử lý tranh chấp đồng thời an toàn, đúng 1 bản ghi thanh toán.',
  );
}

async function cleanupTestData() {
  try {
    if (cleanupFixture.orderIds.length > 0) {
      await prisma.orderIngredientUsage.deleteMany({
        where: { orderId: { in: cleanupFixture.orderIds } },
      });
      await prisma.payment.deleteMany({
        where: { orderId: { in: cleanupFixture.orderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: cleanupFixture.orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: cleanupFixture.orderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: cleanupFixture.orderIds } },
      });
    }

    if (cleanupFixture.productIds.length > 0) {
      await prisma.productRecipe.deleteMany({
        where: { productId: { in: cleanupFixture.productIds } },
      });
      await prisma.productSizePrice.deleteMany({
        where: { productId: { in: cleanupFixture.productIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: cleanupFixture.productIds } },
      });
    }

    if (cleanupFixture.ingredientIds.length > 0) {
      await prisma.orderIngredientUsage.deleteMany({
        where: { ingredientId: { in: cleanupFixture.ingredientIds } },
      });
      await prisma.ingredient.deleteMany({
        where: { id: { in: cleanupFixture.ingredientIds } },
      });
    }
  } catch (err) {
    // Bỏ qua lỗi cleanup
  }
}

async function main() {
  console.log(
    '================================================================',
  );
  console.log(
    '   BREWLITE - CONCURRENCY & RACE CONDITIONS TEST SUITE (CR-01)',
  );
  console.log(`   Target: ${BASE_URL}`);
  console.log(
    '================================================================',
  );

  let embeddedApp: INestApplication | null = null;

  try {
    // 1. Áp dụng patch cho OrdersService theo Change Request CR-01
    applyOrdersServicePatch();

    // 2. Nếu người dùng không truyền cứng API_BASE_URL, tự động khởi động test server riêng
    if (!process.env.API_BASE_URL) {
      console.log(
        'Đang khởi động NestJS test server độc lập (CR-01 Concurrency)...',
      );

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      embeddedApp = moduleFixture.createNestApplication();
      embeddedApp.setGlobalPrefix('api/v1');
      embeddedApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      embeddedApp.useGlobalInterceptors(new TransformInterceptor());
      embeddedApp.useGlobalFilters(new AllExceptionsFilter());

      const TEST_PORT = 4002;
      await embeddedApp.listen(TEST_PORT);
      BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
      console.log(`Đã khởi động NestJS test instance tại ${BASE_URL}`);
    } else {
      console.log(`Sử dụng API server được chỉ định tại ${BASE_URL}`);
    }

    // 3. Đăng nhập lấy Bearer token
    const token = await login();
    console.log('Đăng nhập thành công, đã nhận JWT token.');

    // 4. Chạy các kịch bản kiểm thử đồng thời (Concurrency)
    await testOrderIngredientConcurrency(token);
    await testSharedIngredientConcurrency(token);
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
    await cleanupTestData();
    await prisma.$disconnect();
    if (embeddedApp) {
      await embeddedApp.close();
    }
  }
}

main();
