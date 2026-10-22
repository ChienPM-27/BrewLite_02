import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
          stock: true,
          version: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products are unavailable.');
      }

      const productById = new Map(
        products.map((product) => [product.id, product]),
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

      const toppingById = new Map(
        toppings.map((topping) => [topping.id, topping]),
      );

      // Product: optimistic locking theo version và tồn kho.
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

      // Topping: cập nhật có điều kiện, không dùng version.
      for (const [toppingId, quantity] of toppingQuantities) {
        const result = await tx.topping.updateMany({
          where: {
            id: toppingId,
            isAvailable: true,
            stock: { gte: quantity },
          },
          data: {
            stock: { decrement: quantity },
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for topping ${toppingId}.`,
          );
        }
      }

      // 5. Tạo Order, các dòng hàng và lịch sử trạng thái đầu tiên.
      return tx.order.create({
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
    });
  }
}
