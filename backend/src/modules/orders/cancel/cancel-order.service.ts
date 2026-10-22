import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderService } from '../order.service';

const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
];

export interface CancelOrderResult {
  id: string;
  orderNumber: number;
  status: OrderStatus;
}

/**
 * POST /orders/:id/cancel (D6).
 * - Không ghi `Order.status` trực tiếp: luôn đi qua `OrderService.transition()`.
 * - Đổi trạng thái + hoàn kho Product/Topping nằm trong CÙNG một $transaction.
 */
@Injectable()
export class CancelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  async cancel(orderId: string, userId: string): Promise<CancelOrderResult> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { toppings: true } } },
      });

      // Không tồn tại hoặc không phải chủ đơn -> 404 (không lộ sự tồn tại của đơn).
      if (!order || order.userId !== userId) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      // State guard: chỉ PENDING / PAYMENT_FAILED. Gọi lần 2 (đã CANCELLED) -> 409.
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new ConflictException(
          `Đơn hàng ở trạng thái ${order.status} không thể hủy`,
        );
      }

      // Đổi trạng thái TRƯỚC khi hoàn kho: transition cập nhật có điều kiện
      // (id + status + version) nên khi 2 request hủy đồng thời, chỉ 1 request
      // thắng; request còn lại nhận 409 và rollback -> kho không bị hoàn 2 lần.
      const updated = await this.orderService.transition(
        tx,
        order.id,
        OrderStatus.CANCELLED,
        { changedBy: userId, reason: 'Customer cancelled' },
      );

      // Hoàn kho cho Product (tăng version để vô hiệu hóa optimistic lock đang chạy).
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            version: { increment: 1 },
          },
        });

        // Hoàn kho cho Topping (mỗi topping của dòng bị trừ `quantity` lúc đặt).
        for (const itemTopping of item.toppings) {
          await tx.topping.update({
            where: { id: itemTopping.toppingId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
      };
    });
  }
}
