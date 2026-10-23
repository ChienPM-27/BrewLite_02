import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetOrderHistoryDto } from './dto/get-order-history.dto';

const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  totalAmount: true,
  discountAmount: true,
  finalAmount: true,
  createdAt: true,
  items: {
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

export interface OrderHistoryResult {
  items: Array<{
    id: string;
    orderNumber: number;
    status: OrderStatus;
    totalAmount: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    finalAmount: Prisma.Decimal | number;
    createdAt: Date;
    itemCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query?: GetOrderHistoryDto,
  ): Promise<OrderHistoryResult> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query?.status ? { status: query.status } : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: orderSummarySelect,
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      items: orders.map(({ items, ...order }) => ({
        ...order,
        itemCount: items.reduce((count, item) => count + item.quantity, 0),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: total > 0 && page < totalPages,
      },
    };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        discountAmount: true,
        finalAmount: true,
        paidAt: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            size: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            product: {
              select: {
                name: true,
              },
            },
            toppings: {
              select: {
                id: true,
                toppingId: true,
                price: true,
                topping: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            method: true,
            status: true,
            transactionRef: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return {
      ...order,
      items: order.items.map(({ product, toppings, ...item }) => ({
        ...item,
        name: product.name,
        toppings: toppings.map(({ topping, ...itemTopping }) => ({
          ...itemTopping,
          name: topping.name,
        })),
      })),
    };
  }
}
