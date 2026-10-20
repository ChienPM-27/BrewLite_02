import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  OrderStatus,
  LoyaltyTransactionType,
  Order,
} from '@prisma/client';

import { assertTransition } from './order-state';

@Injectable()
export class OrderService {
  async transition(
    tx: Prisma.TransactionClient,
    orderId: string,
    to: OrderStatus,
    opts?: {
      changedBy?: string;
      reason?: string;
    },
  ): Promise<Order> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        version: true,
        finalAmount: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} not found`,
      );
    }

    // Kiểm tra state machine trước khi cập nhật.
    assertTransition(order.status, to);

    // Optimistic locking: trạng thái và version phải
    // chưa thay đổi kể từ lúc đọc đơn hàng.
    const result = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        version: order.version,
      },
      data: {
        status: to,
        version: { increment: 1 },
        ...(to === OrderStatus.PAID
          ? { paidAt: new Date() }
          : {}),
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Order status changed concurrently. Please retry.',
      );
    }

    // Lưu lịch sử trong cùng transaction của bên gọi.
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: to,
        changedBy: opts?.changedBy,
        reason: opts?.reason,
      },
    });

    // Cộng điểm loyalty khi chuyển sang PAID.
    if (to === OrderStatus.PAID) {
      const existingTransaction =
        await tx.loyaltyTransaction.findFirst({
          where: {
            orderId: order.id,
            type: LoyaltyTransactionType.EARNED,
          },
          select: { id: true },
        });

      if (!existingTransaction) {
        const points = Math.floor(
          Number(order.finalAmount) / 1000,
        );

        await tx.order.update({
          where: { id: order.id },
          data: { pointsEarned: points },
        });

        if (points > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: { increment: points },
            },
          });
        }

        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            points,
            type: LoyaltyTransactionType.EARNED,
            reason: `Earned ${points} points from order ${order.id}`,
          },
        });
      }
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
    });
  }
}
