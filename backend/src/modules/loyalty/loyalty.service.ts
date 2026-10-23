import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  // idempotent theo order.id
  async award(
    tx: Prisma.TransactionClient,
    order: { id: string; userId: string; finalAmount: number },
  ): Promise<void> {
    const points = Math.floor(Number(order.finalAmount) / 1000);
    if (points <= 0) return;

    //Đơn đã cộng điểm thì dừng
    const existingTransaction = await tx.loyaltyTransaction.findFirst({
      where: {
        orderId: order.id,
        type: 'EARNED',
      },
    });
    if (existingTransaction) {
      return;
    }

    // Ghi nhận lịch sử tích điểm
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        points,
        type: 'EARNED',
        reason: `Tích điểm từ đơn hàng ${order.id}`,
      },
    });

    // Cộng điểm vào tài khoản người dùng
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { increment: points } },
    });

    // Lưu số điểm của đơn hàng
    await tx.order.update({
      where: { id: order.id },
      data: { pointsEarned: points },
    });
  }
}
