import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  deductIngredients,
  IngredientDemand,
} from '../../common/ingredient-stock.helper';

import { ProductSize, OrderStatus } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';
import { PromotionsService } from '../promotions/promotions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!userId) {
      throw new BadRequestException('Missing user identity.');
    }

    if (!dto.items?.length) {
      throw new BadRequestException('An order must contain at least one item.');
    }

    // 1. Tính giá theo contract của PricingService.
    const pricingInput = dto.items.map((item) => ({
      productId: item.productId,
      size: item.size ?? ProductSize.M,
      toppingIds: item.toppingIds ?? [],
      quantity: item.quantity,
    }));

    const pricing = await this.pricingService.calculate(pricingInput);

    if (
      pricing.lines.length !== dto.items.length ||
      pricing.lines.some(
        (line, index) => line.productId !== dto.items[index].productId,
      )
    ) {
      throw new BadRequestException(
        'PricingService returned an invalid line breakdown.',
      );
    }

    if (
      !Number.isFinite(pricing.subtotal) ||
      pricing.subtotal < 0 ||
      pricing.lines.some(
        (line) =>
          !Number.isFinite(line.unitPrice) ||
          !Number.isFinite(line.lineTotal) ||
          line.unitPrice < 0 ||
          line.lineTotal < 0,
      )
    ) {
      throw new BadRequestException('PricingService returned invalid prices.');
    }

    // 2. Kiểm tra khuyến mãi theo contract của nhóm.
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

    // 3. Gom số lượng cần trừ kho.
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

    // 4. Trừ kho và tạo đơn trong một transaction.
    return this.prisma.$transaction(async (tx) => {
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

      const toppingById = new Map(
        toppings.map((topping) => [topping.id, topping]),
      );

      const toppingNameMap = new Map(
        toppings.map((topping) => [topping.id, topping.name]),
      );

      // 4. Nạp công thức nguyên liệu của các sản phẩm trong đơn.
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

      // 5. Nạp công thức nguyên liệu của các topping được chọn.
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

      // 6. Kiểm tra công thức và tính nhu cầu nguyên liệu cho toàn bộ đơn.
      const productNameMap = new Map(
        products.map((product) => [product.id, product.name]),
      );

      const needs: IngredientDemand[] = [];

      for (const item of dto.items) {
        const itemSize = item.size ?? ProductSize.M;
        const recipeKey = `${item.productId}_${itemSize}`;

        const productRecipes = productRecipeMap.get(recipeKey) ?? [];

        // D15: thiếu công thức món/size thì không được tạo đơn.
        if (productRecipes.length === 0) {
          const productName =
            productNameMap.get(item.productId) ?? item.productId;

          throw new BadRequestException(
            `Món "${productName}" (size ${itemSize}) chưa có công thức nguyên liệu.`,
          );
        }

        // Nguyên liệu của món chính.
        for (const recipe of productRecipes) {
          needs.push({
            ingredientId: recipe.ingredientId,
            quantity: recipe.quantity * item.quantity,
          });
        }

        // Nguyên liệu của các topping thuộc dòng hàng này.
        for (const toppingId of item.toppingIds ?? []) {
          const toppingRecipes = toppingRecipeMap.get(toppingId) ?? [];

          // Không cho phép bán topping chưa có công thức nguyên liệu.
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

      // 7. Trừ kho nguyên liệu nguyên tử.
      // Helper tự gom ingredientId trùng nhau và sắp xếp tăng dần.
      const deductedUsages = await deductIngredients(tx, needs);

      // 8. Tạo Order, các dòng hàng và lịch sử trạng thái đầu tiên.
      const order = await tx.order.create({
        data: {
          user: {
            connect: { id: userId },
          },

          ...(promotion
            ? {
                promotion: {
                  connect: { id: promotion.promotionId },
                },
              }
            : {}),

          status: OrderStatus.PENDING,
          totalAmount: pricing.subtotal,
          discountAmount,
          finalAmount,

          items: {
            create: dto.items.map((item, index) => {
              const line = pricing.lines[index];

              return {
                product: {
                  connect: { id: item.productId },
                },
                size: item.size ?? ProductSize.M,
                quantity: item.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,

                toppings: {
                  create: (item.toppingIds ?? []).map((toppingId) => {
                    const topping = toppingById.get(toppingId);

                    if (!topping) {
                      throw new BadRequestException(
                        `Topping ${toppingId} is unavailable.`,
                      );
                    }

                    return {
                      topping: {
                        connect: { id: toppingId },
                      },
                      price: topping.price,
                    };
                  }),
                },
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
          payments: true,
          items: {
            include: {
              toppings: {
                select: {
                  toppingId: true,
                  price: true,
                },
              },
            },
          },
          statusHistory: true,
        },
      });

      // 9. Lưu snapshot nguyên liệu đã trừ thành công.
      if (deductedUsages.length > 0) {
        await tx.orderIngredientUsage.createMany({
          data: deductedUsages.map((usage) => ({
            orderId: order.id,
            ingredientId: usage.ingredientId,
            quantity: usage.quantity,
          })),
        });
      }

      return order;
    });
  }
}
