import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { restoreIngredients } from '../../../common/ingredient-stock.helper';
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
 * POST /orders/:id/cancel (D6, CR-01).
 * - Không ghi `Order.status` trực tiếp: luôn đi qua `OrderService.transition()`.
 * - Đổi trạng thái + hoàn kho nguyên liệu theo snapshot nằm trong CÙNG một $transaction.
 * - Tương thích ngược: Đơn cũ không có snapshot thì bỏ qua bước hoàn kho, không ném 500.
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

      // 2. Lấy snapshot nguyên liệu đã dùng của đơn hàng từ bảng OrderIngredientUsage
      const usages = await tx.orderIngredientUsage.findMany({
        where: { orderId },
      });

      // 3. Tương thích ngược: Đơn cũ tạo trước migration không có snapshot thì bỏ qua, không ném 500
      if (usages && usages.length > 0) {
        await restoreIngredients(
          tx,
          usages.map((u) => ({
            ingredientId: u.ingredientId,
            quantity: Number(u.quantity),
          })),
        );
      }

      return {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
      };
    });
  }
}
