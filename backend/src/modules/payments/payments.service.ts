
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrderStatus,
  PaymentStatus,
  PaymentGateway,
  Prisma,
} from '@prisma/client';

import { createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockGatewayService } from './mock-gateway.service';
import { VnpayGatewayService } from './vnpay/vnpay-gateway.service';

type PaymentResponseSource = {
  id: string;
  orderId: string;
  idempotencyKey: string;
  requestHash: string | null;
  amount: Prisma.Decimal;
  method: Prisma.PaymentGetPayload<{}>['method'];
  status: PaymentStatus;
  failureReason: string | null;
  transactionRef: string | null;
  createdAt: Date;

  // Các trường bổ sung cho VNPay
  gateway?: PaymentGateway;
  gatewayTransactionNo?: string | null;
  paymentUrl?: string | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly loyaltyService: LoyaltyService,
    private readonly mockGateway: MockGatewayService,
    private readonly vnpayGateway: VnpayGatewayService,
  ) {}

  // ==========================================
  // TẠO PAYMENT
  // ==========================================

  async createPayment(
    userId: string,
    idempotencyKey: string,
    body: CreatePaymentDto,
    mockOutcome?: string,
    clientIp: string = '127.0.0.1',
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

    const gateway = body.gateway ?? PaymentGateway.MOCK;

    if (
      gateway !== PaymentGateway.MOCK &&
      gateway !== PaymentGateway.VNPAY
    ) {
      throw new BadRequestException(
        'Payment Gateway không hợp lệ',
      );
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: body.orderId,
          method: body.method,
          gateway,
        }),
      )
      .digest('hex');

    // Kiểm tra request đã được xử lý trước đó.
    const existingPayment =
      await this.prisma.payment.findUnique({
        where: {
          idempotencyKey: normalizedKey,
        },
        include: {
          order: true,
        },
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
          where: {
            id: body.orderId,
          },
        });

        if (!order || order.userId !== userId) {
          throw new NotFoundException(
            'Không tìm thấy đơn hàng',
          );
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép thanh toán',
          );
        }

        // Retry: chuyển đơn hàng về PENDING.
        // Không xử lý tồn kho nguyên liệu tại Payment.
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

        // Tạo Payment PENDING trước khi xử lý Gateway.
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: normalizedKey,
            requestHash,
            amount: order.finalAmount,
            method: body.method,
            gateway,
            status: PaymentStatus.PENDING,
          },
        });

        // ==========================================
        // GATEWAY 1: MOCK
        // ==========================================

        if (gateway === PaymentGateway.MOCK) {
          const outcome =
            this.mockGateway.processPayment(mockOutcome);

          if (outcome === 'SUCCESS') {
            await this.orderService.transition(
              tx,
              order.id,
              OrderStatus.PAID,
              {
                changedBy: userId,
                reason: 'Thanh toán Mock thành công',
              },
            );

            await this.loyaltyService.award(tx, {
              id: order.id,
              userId: order.userId,
              finalAmount: Number(order.finalAmount),
            });

            const updatedPayment =
              await tx.payment.update({
                where: {
                  id: payment.id,
                },
                data: {
                  status: PaymentStatus.SUCCESS,
                  transactionRef: `MOCK-${payment.id}`,
                },
              });

            return this.toPaymentResponse(updatedPayment);
          }

          // Mock thất bại.
          await this.orderService.transition(
            tx,
            order.id,
            OrderStatus.PAYMENT_FAILED,
            {
              changedBy: userId,
              reason: 'Thanh toán Mock thất bại',
            },
          );

          const updatedPayment =
            await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                status: PaymentStatus.FAILED,
                failureReason: 'Mock payment failed',
              },
            });

          return this.toPaymentResponse(updatedPayment);
        }

        // ==========================================
        // GATEWAY 2: VNPAY
        // ==========================================

        if (gateway === PaymentGateway.VNPAY) {
          const transactionRef = payment.id;

          const paymentUrl =
            this.vnpayGateway.createPaymentUrl({
              transactionRef,
              amount: Number(order.finalAmount),
              orderInfo: `Thanh toan don hang ${order.orderNumber}`,
              clientIp,
            });

          const updatedPayment =
            await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                transactionRef,
                paymentUrl,
              },
            });

          // Chưa xác nhận thanh toán tại đây.
          // Chờ VNPay IPN xác nhận kết quả.
          return this.toPaymentResponse(updatedPayment);
        }

        throw new BadRequestException(
          'Payment Gateway không hợp lệ',
        );
      });
    } catch (error) {
      // Xử lý hai request cùng Idempotency-Key chạy đồng thời.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const paymentAfterRace =
          await this.prisma.payment.findUnique({
            where: {
              idempotencyKey: normalizedKey,
            },
            include: {
              order: true,
            },
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

  // ==========================================
  // XỬ LÝ VNPAY IPN
  // ==========================================

  async handleVnpayIpn(
    params: Record<string, string | string[] | undefined>,
  ) {
    // 1. Kiểm tra chữ ký VNPay.
    const isValidSignature =
      this.vnpayGateway.verifyIpnSignature(params);

    if (!isValidSignature) {
      return {
        RspCode: '97',
        Message: 'Invalid signature',
      };
    }

    // 2. Lấy thông tin giao dịch.
    const transactionRef = params['vnp_TxnRef'];
    const amount = params['vnp_Amount'];
    const responseCode = params['vnp_ResponseCode'];
    const transactionStatus = params['vnp_TransactionStatus'];
    const gatewayTransactionNo = params['vnp_TransactionNo'];

    if (
      typeof transactionRef !== 'string' ||
      typeof amount !== 'string' ||
      typeof responseCode !== 'string' ||
      typeof transactionStatus !== 'string'
    ) {
      return {
        RspCode: '99',
        Message: 'Invalid payment data',
      };
    }

    const receivedAmount = Number(amount);

    if (!Number.isSafeInteger(receivedAmount)) {
      return {
        RspCode: '04',
        Message: 'Invalid amount',
      };
    }

    return this.prisma.$transaction(async (tx) => {
      // 3. Tìm Payment theo mã giao dịch.
      const payment = await tx.payment.findFirst({
        where: {
          transactionRef,
          gateway: PaymentGateway.VNPAY,
        },
        include: {
          order: true,
        },
      });

      if (!payment) {
        return {
          RspCode: '01',
          Message: 'Order not found',
        };
      }

      // 4. Đối chiếu số tiền.
      const expectedAmount =
        Number(payment.amount) * 100;

      if (
        !Number.isSafeInteger(expectedAmount) ||
        receivedAmount !== expectedAmount
      ) {
        return {
          RspCode: '04',
          Message: 'Invalid amount',
        };
      }

      // 5. Không xử lý lại giao dịch đã xác nhận.
      if (payment.status !== PaymentStatus.PENDING) {
        return {
          RspCode: '02',
          Message: 'Order already confirmed',
        };
      }

      // 6. Xác định kết quả từ VNPay.
      const isSuccess =
        responseCode === '00' &&
        transactionStatus === '00';

      // 7. Cập nhật Payment có điều kiện.
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: isSuccess
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED,

          gatewayTransactionNo:
            typeof gatewayTransactionNo === 'string'
              ? gatewayTransactionNo
              : null,

          failureReason: isSuccess
            ? null
            : `VNPay response: ${responseCode}, transaction status: ${transactionStatus}`,
        },
      });

      // Nếu IPN khác đã cập nhật trước đó thì không xử lý lại.
      if (paymentUpdate.count === 0) {
        return {
          RspCode: '02',
          Message: 'Order already confirmed',
        };
      }

      // 8. Cập nhật trạng thái Order.
      if (isSuccess) {
        await this.orderService.transition(
          tx,
          payment.orderId,
          OrderStatus.PAID,
          {
            changedBy: payment.order.userId,
            reason: 'Thanh toán VNPay thành công',
          },
        );

        // 9. Chỉ cộng Loyalty khi thanh toán thành công.
        await this.loyaltyService.award(tx, {
          id: payment.order.id,
          userId: payment.order.userId,
          finalAmount: Number(payment.order.finalAmount),
        });
      } else {
        await this.orderService.transition(
          tx,
          payment.orderId,
          OrderStatus.PAYMENT_FAILED,
          {
            changedBy: payment.order.userId,
            reason: 'Thanh toán VNPay thất bại',
          },
        );
      }

      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    });
  }

  // ==========================================
  // IDEMPOTENCY REPLAY
  // ==========================================

  private replayExistingPayment(
    payment: Prisma.PaymentGetPayload<{
      include: {
        order: true;
      };
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

    // Replay không tạo Payment mới,
    // không gọi lại Gateway và không cộng Loyalty lần nữa.
    return this.toPaymentResponse(payment);
  }

  // ==========================================
  // FORMAT RESPONSE
  // ==========================================

  private toPaymentResponse(
    payment: PaymentResponseSource,
  ) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      gateway: payment.gateway,
      status: payment.status,
      transactionRef: payment.transactionRef,
      gatewayTransactionNo: payment.gatewayTransactionNo,
      paymentUrl: payment.paymentUrl,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
    };
  }

  
  async getPaymentById(
    paymentId: string,
    userId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: {
        userId,
      },
    },
  });

  if (!payment) {
    throw new NotFoundException(
      'Không tìm thấy giao dịch thanh toán',
    );
  }

  return this.toPaymentResponse(payment);
}

}
