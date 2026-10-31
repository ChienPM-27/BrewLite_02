import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, ProductSize } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import {
  ADVANCEABLE_STATUSES,
  AdvanceableStatus,
} from './dto/advance-order.dto';

/** Bước kế tiếp do server tính — client không được chọn trạng thái đích. */
const NEXT_STATUS: Record<AdvanceableStatus, OrderStatus> = {
  PAID: OrderStatus.PREPARING,
  PREPARING: OrderStatus.READY,
  READY: OrderStatus.COMPLETED,
};

const MAX_ORDERS = 100;
const FALLBACK_CUSTOMER_NAME = 'Khách';
const CONFLICT_MESSAGE =
  'Đơn hàng đã được cập nhật bởi người khác. Vui lòng tải lại danh sách.';

export interface AdminOrderItem {
  productName: string;
  size: ProductSize;
  quantity: number;
  toppings: string[];
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paidAt: Date | null;
  customerName: string;
  items: AdminOrderItem[];
}

export interface AdvanceOrderResult {
  id: string;
  orderNumber: number;
  fromStatus: OrderStatus;
  status: OrderStatus;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  /** GET /admin/orders — chỉ đơn PAID/PREPARING/READY, cũ nhất trước. Không trả giá, email. */
  async findActive(): Promise<AdminOrder[]> {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: [...ADVANCEABLE_STATUSES] } },
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      take: MAX_ORDERS,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paidAt: true,
        user: { select: { fullName: true } },
        items: {
          orderBy: { id: 'asc' },
          select: {
            size: true,
            quantity: true,
            product: { select: { name: true } },
            toppings: { select: { topping: { select: { name: true } } } },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paidAt: order.paidAt,
      customerName: order.user.fullName?.trim() || FALLBACK_CUSTOMER_NAME,
      items: order.items.map((item) => ({
        productName: item.product.name,
        size: item.size,
        quantity: item.quantity,
        toppings: item.toppings.map((t) => t.topping.name),
      })),
    }));
  }

  /**
   * PATCH /admin/orders/:id/advance.
   * Đọc trạng thái + so khớp expectedStatus + transition nằm trong CÙNG một $transaction;
   * transition() cập nhật có điều kiện theo version nên 2 request đồng thời chỉ 1 thắng (409).
   */
  async advance(
    orderId: string,
    expectedStatus: AdvanceableStatus,
  ): Promise<AdvanceOrderResult> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      // expectedStatus chỉ nhận PAID/PREPARING/READY (DTO), nên khớp được tức là còn bước kế tiếp;
      // đơn PENDING/CANCELLED/COMPLETED... luôn lệch -> 409.
      if (order.status !== expectedStatus) {
        throw new ConflictException(CONFLICT_MESSAGE);
      }

      // Va chạm version (2 admin cùng bấm) -> transition() tự ném 409.
      const updated = await this.orderService.transition(
        tx,
        order.id,
        NEXT_STATUS[expectedStatus],
        { changedBy: 'admin' },
      );

      return {
        id: updated.id,
        orderNumber: updated.orderNumber,
        fromStatus: expectedStatus,
        status: updated.status,
      };
    });
  }
}
