
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
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
export class PaymentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentsService.name);
  private cachedTunnelHostname: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly loyaltyService: LoyaltyService,
    private readonly mockGateway: MockGatewayService,
    private readonly vnpayGateway: VnpayGatewayService,
  ) {}

  async detectTunnelHostname(): Promise<string | null> {
    if (this.cachedTunnelHostname) {
      return this.cachedTunnelHostname;
    }
    try {
      const res = await fetch('http://tunnel:20241/metrics', {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/userHostname="https:\/\/([^"]+)"/);
        if (match && match[1]) {
          this.cachedTunnelHostname = match[1];
          return this.cachedTunnelHostname;
        }
      }
    } catch {
      // Tunnel chưa sẵn sàng hoặc không chạy qua docker
    }
    return null;
  }

  async getTunnelInfo() {
    const hostname = await this.detectTunnelHostname();
    const creds = this.vnpayGateway.getCredentials();
    return {
      tunnelUrl: hostname ? `https://${hostname}` : null,
      ipnUrl: hostname ? `https://${hostname}/api/v1/payments/vnpay/ipn` : null,
      sandbox: {
        merchantAdminUrl: 'https://sandbox.vnpayment.vn/merchantv2/',
        email: 'pminhchien2006@gmail.com',
        password: 'chienCHIEN1230',
        tmnCode: creds.tmnCode,
      },
      testCard: {
        bank: 'NCB',
        cardNumber: '9704198526191432198',
        cardHolder: 'NGUYEN VAN A',
        issueDate: '07/15',
        otp: '123456',
      },
    };
  }

  async onApplicationBootstrap() {
    // Tự động kiểm tra và in thông tin kết nối VNPay ra console
    setTimeout(async () => {
      for (let i = 0; i < 6; i++) {
        const hostname = await this.detectTunnelHostname();
        if (hostname) {
          const ipnUrl = `https://${hostname}/api/v1/payments/vnpay/ipn`;
          console.log('\n' + '='.repeat(70));
          console.log('🌐 [VNPAY SANDBOX] CLOUDFLARE TUNNEL ĐÃ SẴN SÀNG:');
          console.log(`👉 IPN URL CẦN GẮN: ${ipnUrl}`);
          console.log('👉 Trang quản lý Merchant: https://sandbox.vnpayment.vn/merchantv2/');
          console.log('   - Email: pminhchien2006@gmail.com | Mật khẩu: chienCHIEN1230');
          console.log('   - Mã Website (TmnCode): JVDDQS32');
          console.log('💳 Thẻ test NCB: 9704198526191432198 | NGUYEN VAN A | 07/15 | OTP: 123456');
          console.log('='.repeat(70) + '\n');
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }, 2000);
  }

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

        // Đối với VNPay: Kiểm tra nếu đã có payment PENDING cho đơn hàng này.
        // Tái sử dụng payment PENDING nếu còn trong hạn 15 phút để tránh tạo nhiều payment
        // khiến khách hàng bị trừ tiền nhiều lần.
        if (gateway === PaymentGateway.VNPAY) {
          const existingPending = await tx.payment.findFirst({
            where: {
              orderId: order.id,
              gateway: PaymentGateway.VNPAY,
              status: PaymentStatus.PENDING,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (existingPending) {
            const ageMs = Date.now() - existingPending.createdAt.getTime();
            const ttlMs = 15 * 60 * 1000;

            if (ageMs < ttlMs && existingPending.paymentUrl) {
              return this.toPaymentResponse(existingPending);
            }

            // Hết hạn 15 phút -> đánh dấu FAILED để tạo payment mới
            await tx.payment.update({
              where: {
                id: existingPending.id,
              },
              data: {
                status: PaymentStatus.FAILED,
                failureReason: 'Hết hạn thanh toán VNPay (15 phút)',
              },
            });
          }
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
              expireMinutes: 15,
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

      const orderStatus = payment.order.status;

      // 7. Cập nhật Payment có điều kiện.
      let failureReason: string | null = null;
      if (!isSuccess) {
        failureReason = `VNPay response: ${responseCode}, transaction status: ${transactionStatus}`;
      } else if (orderStatus !== OrderStatus.PENDING) {
        failureReason = `Cần hoàn tiền thủ công: đơn đang ở trạng thái ${orderStatus}`;
      }

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

          failureReason,
        },
      });

      // Nếu IPN khác đã cập nhật trước đó thì không xử lý lại.
      if (paymentUpdate.count === 0) {
        return {
          RspCode: '02',
          Message: 'Order already confirmed',
        };
      }

      // Kiểm tra trạng thái đơn hàng. Nếu đơn không ở trạng thái PENDING
      // (ví dụ đã bị HỦY - CANCELLED, hoặc đã thanh toán - PAID, hoặc PAYMENT_FAILED),
      // KHÔNG gọi transition và KHÔNG cộng loyalty để tránh ném ConflictException (409).
      if (orderStatus !== OrderStatus.PENDING) {
        this.logger.warn(
          `VNPay IPN nhận kết quả cho đơn hàng ${payment.orderId} nhưng đơn đang ở trạng thái ${orderStatus}. Không chuyển trạng thái đơn.`,
        );
        return {
          RspCode: '00',
          Message: 'Confirm Success',
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
