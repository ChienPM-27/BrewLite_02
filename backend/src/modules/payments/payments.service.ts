import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockGatewayService } from './mock-gateway.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly loyaltyService: LoyaltyService,
    private readonly mockGateway: MockGatewayService,
  ) {}

  async createPayment(
    userId: string,
    idempotencyKey: string,
    body: CreatePaymentDto,
    mockOutcome?: string,
  ) {
    const normalizedKey = idempotencyKey?.trim();

    if (!normalizedKey) {
      throw new BadRequestException(
        'Idempotency-Key là bắt buộc',
      );
    }

    if (!userId || !body?.orderId || !body?.method) {
      throw new BadRequestException(
        'orderId và method là bắt buộc',
      );
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: body.orderId,
          method: body.method,
        }),
      )
      .digest('hex');

    // 1. Cùng key đã tồn tại: trả lại kết quả cũ.
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: normalizedKey },
      include: { order: true },
    });

    if (existingPayment) {
      return this.replayExistingPayment(
        existingPayment,
        userId,
        requestHash,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 2. Kiểm tra đơn hàng và quyền sở hữu.
        const order = await tx.order.findUnique({
          where: { id: body.orderId },
        });

        if (!order || order.userId !== userId) {
          throw new NotFoundException(
            'Không tìm thấy đơn hàng',
          );
        }

        // 3. Chỉ cho phép thanh toán trạng thái hợp lệ.
        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép thanh toán',
          );
        }

        // 4. Nếu là đơn hàng thử lại thanh toán sau khi thất bại,
        // chuyển trạng thái PAYMENT_FAILED -> PENDING theo đúng State Machine (D1, TC-PAY-13)
        if (order.status === OrderStatus.PAYMENT_FAILED) {
          await this.orderService.transition(
            tx,
            order.id,
            OrderStatus.PENDING,
            {
              changedBy: userId,
              reason: 'Khách hàng thử lại thanh toán',
            },
          );
        }

        // 5. Xác định kết quả mock trước khi tạo Payment.
        const outcome =
          this.mockGateway.processPayment(mockOutcome);

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: normalizedKey,
            requestHash,
            amount: order.finalAmount,
            method: body.method,
            status: PaymentStatus.PENDING,
          },
        });

        // 6. Thanh toán thành công.
        if (outcome === 'SUCCESS') {
          await this.orderService.transition(
            tx,
            order.id,
            OrderStatus.PAID,
            {
              changedBy: userId,
              reason: 'Thanh toán thành công',
            },
          );

          // Giữ lời gọi theo đúng contract Payment hiện tại.
          await this.loyaltyService.award(tx, {
            id: order.id,
            userId: order.userId,
            finalAmount: Number(order.finalAmount),
          });

          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionRef: `MOCK-${payment.id}`,
            },
          });

          return this.toPaymentResponse(updated);
        }

        // 7. Thanh toán thất bại.
        await this.orderService.transition(
          tx,
          order.id,
          OrderStatus.PAYMENT_FAILED,
          {
            changedBy: userId,
            reason: 'Thanh toán thất bại',
          },
        );

        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: 'Mock payment failed',
          },
        });

        return this.toPaymentResponse(updated);
      });
    } catch (error) {
      // 8. Hai request cùng key có thể chạy đồng thời.
      // Nếu request còn lại đã tạo Payment, trả lại kết quả đó.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const paymentAfterRace =
          await this.prisma.payment.findUnique({
            where: { idempotencyKey: normalizedKey },
            include: { order: true },
          });

        if (paymentAfterRace) {
          return this.replayExistingPayment(
            paymentAfterRace,
            userId,
            requestHash,
          );
        }
      }

      throw error;
    }
  }

  private replayExistingPayment(
    payment: Prisma.PaymentGetPayload<{
      include: { order: true };
    }>,
    userId: string,
    requestHash: string,
  ) {
    if (payment.order.userId !== userId) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng',
      );
    }

    if (payment.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency-Key đã được sử dụng với nội dung khác',
      );
    }

    return this.toPaymentResponse(payment);
  }

  private toPaymentResponse(payment: {
    id: string;
    orderId: string;
    amount: any;
    method: any;
    status: any;
    transactionRef: string | null;
    failureReason: string | null;
    createdAt: Date;
  }) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      transactionRef: payment.transactionRef,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
    };
  }
}
