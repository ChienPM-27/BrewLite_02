

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { ProductSize, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async healthCheck() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      module: 'Orders',
      status: 'Database connected',
    };
  }

  async findAll(page = 1, limit = 10) {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: true,
              toppings: {
                include: { topping: true },
              },
            },
          },
        },
      }),
      this.prisma.order.count(),
    ]);

    return {
      items: orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            toppings: {
              include: { topping: true },
            },
          },
        },
        payments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
  
  async create(dto: CreateOrderDto) {
    if (!dto.userId || typeof dto.userId !== 'string') {
      throw new BadRequestException('userId không hợp lệ');
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      let totalAmount = new Prisma.Decimal(0);
      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const item of dto.items) {
        if (
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100
        ) {
          throw new BadRequestException(
            'productId hoặc quantity không hợp lệ',
          );
        }

        const size = item.size ?? 'M';

        if (!Object.values(ProductSize).includes(size as ProductSize)) {
          throw new BadRequestException('Size phải là S, M hoặc L');
        }

        const toppingIds = item.toppingIds ?? [];

        if (
          !Array.isArray(toppingIds) ||
          !toppingIds.every((id) => typeof id === 'string') ||
          new Set(toppingIds).size !== toppingIds.length
        ) {
          throw new BadRequestException('Danh sách topping không hợp lệ');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { sizePrices: true },
        });

        if (!product) {
          throw new NotFoundException(
            `Không tìm thấy sản phẩm ${item.productId}`,
          );
        }

        
        if (!product.isAvailable || product.stock < item.quantity) {
        throw new BadRequestException(
            `Sản phẩm ${product.name} không khả dụng hoặc không đủ tồn kho`,
        );
        }

        const productUpdate = await tx.product.updateMany({
        where: {
            id: product.id,
            isAvailable: true,
            stock: { gte: item.quantity },
        },
        data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
        },
        });

        if (productUpdate.count !== 1) {
        throw new BadRequestException(
            `Sản phẩm ${product.name} không đủ tồn kho`,
        );
        }


        const sizePrice = product.sizePrices.find(
          (price) => price.size === size,
        );

        if (!sizePrice) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} không có size ${size}`,
          );
        }

        const toppings = toppingIds.length
          ? await tx.topping.findMany({
              where: { id: { in: toppingIds } },
            })
          : [];

        if (toppings.length !== toppingIds.length) {
          throw new NotFoundException('Có topping không tồn tại');
        }

        
        if (toppings.some((topping) => !topping.isAvailable)) {
        throw new BadRequestException('Có topping hiện không khả dụng');
        }

        for (const topping of toppings) {
        const toppingUpdate = await tx.topping.updateMany({
            where: {
            id: topping.id,
            isAvailable: true,
            stock: { gte: item.quantity },
            },
            data: {
            stock: { decrement: item.quantity },
            },
        });

        if (toppingUpdate.count !== 1) {
            throw new BadRequestException(
            `Topping ${topping.name} không đủ tồn kho`,
            );
        }
        }


        const unitPrice = new Prisma.Decimal(product.basePrice).add(
          sizePrice.priceAdjustment,
        );

        const toppingTotal = toppings.reduce(
          (sum, topping) => sum.add(topping.price),
          new Prisma.Decimal(0),
        );

        const lineTotal = unitPrice
          .add(toppingTotal)
          .mul(item.quantity);

        totalAmount = totalAmount.add(lineTotal);

        orderItems.push({
          product: { connect: { id: product.id } },
          size,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
          toppings: {
            create: toppings.map((topping) => ({
              topping: { connect: { id: topping.id } },
              price: topping.price,
            })),
          },
        });
      }

      return tx.order.create({
        data: {
          user: { connect: { id: user.id } },
          status: 'PENDING',
          totalAmount,
          discountAmount: new Prisma.Decimal(0),
          finalAmount: totalAmount,
          items: { create: orderItems },
          statusHistory: {
            create: {
              fromStatus: 'PENDING',
              toStatus: 'PENDING',
              changedBy: 'system',
              reason: 'Order created',
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
              toppings: { include: { topping: true } },
            },
          },
          statusHistory: true,
        },
      });
    });
  }

}
