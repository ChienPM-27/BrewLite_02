
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockGatewayService } from './mock-gateway.service';

type PaymentResponseSource = {
  id: string;
  orderId: string;
  amount: Prisma.Decimal;
  method: Prisma.PaymentGetPayload<{}>['method'];
  status: PaymentStatus;
  transactionRef: string | null;
  failureReason: string | null;
  createdAt: Date;
};

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
      throw new BadRequestException('Idempotency-Key là bắt buộc');
    }

    if (!userId || !body?.orderId || !body?.method) {
      throw new BadRequestException('orderId và method là bắt buộc');
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: body.orderId,
          method: body.method,
        }),
      )
      .digest('hex');

    // Cùng key và cùng nội dung: trả lại kết quả đã lưu.
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
        const order = await tx.order.findUnique({
          where: { id: body.orderId },
        });

        if (!order || order.userId !== userId) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép thanh toán',
          );
        }

        // Retry: chỉ chuyển trạng thái đơn hàng.
        // Không trừ hoặc hoàn nguyên tồn kho nguyên liệu tại Payment.
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

        const outcome = this.mockGateway.processPayment(mockOutcome);

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

        if (outcome === 'SUCCESS') {
          await this.orderService.transition(tx, order.id, OrderStatus.PAID, {
            changedBy: userId,
            reason: 'Thanh toán thành công',
          });

          await this.loyaltyService.award(tx, {
            id: order.id,
            userId: order.userId,
            finalAmount: Number(order.finalAmount),
          });

          const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionRef: `MOCK-${payment.id}`,
            },
          });

          return this.toPaymentResponse(updatedPayment);
        }

        // Thanh toán thất bại: cập nhật trạng thái,
        // không gọi xử lý tồn kho nguyên liệu.
        await this.orderService.transition(
          tx,
          order.id,
          OrderStatus.PAYMENT_FAILED,
          {
            changedBy: userId,
            reason: 'Thanh toán thất bại',
          },
        );

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: 'Mock payment failed',
          },
        });

        return this.toPaymentResponse(updatedPayment);
      });
    } catch (error) {
      // Hai request cùng key có thể chạy đồng thời.
      // Nếu request còn lại đã tạo Payment, kiểm tra và replay kết quả.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const paymentAfterRace = await this.prisma.payment.findUnique({
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
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (payment.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency-Key đã được sử dụng với nội dung khác',
      );
    }

    // Replay chỉ trả kết quả đã lưu; không chạy lại thanh toán,
    // không thay đổi trạng thái đơn hàng hoặc tồn kho nguyên liệu.
    return this.toPaymentResponse(payment);
  }

  private toPaymentResponse(payment: PaymentResponseSource) {
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
