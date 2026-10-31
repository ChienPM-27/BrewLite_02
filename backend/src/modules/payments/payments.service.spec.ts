import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  OrderStatus,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { createHash } from 'crypto';

import { PaymentsService } from './payments.service';
import { MockGatewayService } from './mock-gateway.service';
import { VnpayGatewayService } from './vnpay/vnpay-gateway.service';

import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockGateway: MockGatewayService;
  let configService: ConfigService;

  const tx = {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    // Payment không được trực tiếp cập nhật tồn kho nguyên liệu.
    ingredient: {
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const prismaMock = {
    payment: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const orderServiceMock = {
    transition: jest.fn(),
  };

  const loyaltyServiceMock = {
    award: jest.fn(),
  };

  // Mock VNPay Gateway
  const vnpayGatewayMock = {
    createPaymentUrl: jest.fn(),
    verifyIpnSignature: jest.fn(),
  };

  const validDto = {
    orderId: 'order-1',
    method: PaymentMethod.E_WALLET,
  };

  // Phải giống cách PaymentsService tạo requestHash.
  const validRequestHash = createHash('sha256')
    .update(
      JSON.stringify({
        orderId: validDto.orderId,
        method: validDto.method,
        gateway: PaymentGateway.MOCK,
      }),
    )
    .digest('hex');

  function expectIngredientStockUnchanged() {
    expect(tx.ingredient.updateMany).not.toHaveBeenCalled();
    expect(tx.ingredient.update).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    jest.clearAllMocks();

    configService = new ConfigService({
      NODE_ENV: 'development',
    });

    mockGateway = new MockGatewayService(configService);

    service = new PaymentsService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
      loyaltyServiceMock as unknown as LoyaltyService,
      mockGateway,
      vnpayGatewayMock as unknown as VnpayGatewayService,
    );

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (client: typeof tx) => Promise<unknown>,
      ) => callback(tx),
    );
  });

  // ==========================================
  // MOCK PAYMENT TESTS
  // ==========================================

  it('creates payment successfully and transitions PENDING -> PAID, awarding loyalty points', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    tx.payment.update.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-1',
    });

    const result = await service.createPayment(
      'user-1',
      'idem-key-1',
      validDto,
      'SUCCESS',
    );

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-1',
      OrderStatus.PAID,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(loyaltyServiceMock.award).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        id: 'order-1',
        userId: 'user-1',
        finalAmount: 65000,
      }),
    );

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expectIngredientStockUnchanged();
  });

  it('creates failed payment and transitions PENDING -> PAYMENT_FAILED without awarding loyalty or changing ingredient stock', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    tx.payment.update.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.FAILED,
      failureReason: 'Mock payment failed',
    });

    const result = await service.createPayment(
      'user-1',
      'idem-key-1',
      validDto,
      'FAILED',
    );

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-1',
      OrderStatus.PAYMENT_FAILED,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();
    expect(result.status).toBe(PaymentStatus.FAILED);
    expectIngredientStockUnchanged();
  });

  it('retries failed payment with new key: PAYMENT_FAILED -> PENDING -> PAID without changing ingredient stock', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PAYMENT_FAILED,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-2',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    tx.payment.update.mockResolvedValue({
      id: 'pay-2',
      orderId: 'order-1',
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-2',
    });

    const result = await service.createPayment(
      'user-1',
      'idem-key-2',
      validDto,
      'SUCCESS',
    );

    expect(orderServiceMock.transition).toHaveBeenNthCalledWith(
      1,
      tx,
      'order-1',
      OrderStatus.PENDING,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(orderServiceMock.transition).toHaveBeenNthCalledWith(
      2,
      tx,
      'order-1',
      OrderStatus.PAID,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expectIngredientStockUnchanged();
  });

  it('retries failed payment with new key and fails again without changing ingredient stock', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PAYMENT_FAILED,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-3',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    tx.payment.update.mockResolvedValue({
      id: 'pay-3',
      orderId: 'order-1',
      status: PaymentStatus.FAILED,
      failureReason: 'Mock payment failed',
    });

    const result = await service.createPayment(
      'user-1',
      'idem-key-3',
      validDto,
      'FAILED',
    );

    expect(orderServiceMock.transition).toHaveBeenNthCalledWith(
      1,
      tx,
      'order-1',
      OrderStatus.PENDING,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(orderServiceMock.transition).toHaveBeenNthCalledWith(
      2,
      tx,
      'order-1',
      OrderStatus.PAYMENT_FAILED,
      expect.objectContaining({ changedBy: 'user-1' }),
    );

    expect(result.status).toBe(PaymentStatus.FAILED);
    expectIngredientStockUnchanged();
  });

  it('replays existing payment for the same key and payload without changing ingredient stock', async () => {
    const existing = {
      id: 'pay-1',
      orderId: 'order-1',
      amount: new Prisma.Decimal(65000),
      method: PaymentMethod.E_WALLET,
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-1',
      failureReason: null,
      createdAt: new Date('2026-10-22T00:00:00.000Z'),
      requestHash: validRequestHash,
      order: {
        userId: 'user-1',
      },
    };

    prismaMock.payment.findUnique.mockResolvedValue(existing);

    const result = await service.createPayment(
      'user-1',
      'idem-key-1',
      validDto,
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(orderServiceMock.transition).not.toHaveBeenCalled();
    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();
    expect(result.id).toBe('pay-1');
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result).not.toHaveProperty('order');
    expectIngredientStockUnchanged();
  });

  it('replays existing payment after a P2002 race without changing ingredient stock', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce(null);

    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint violation',
      {
        code: 'P2002',
        clientVersion: '5.0.0',
      },
    );

    prismaMock.$transaction.mockRejectedValueOnce(p2002Error);

    const racePayment = {
      id: 'pay-race',
      orderId: 'order-1',
      amount: new Prisma.Decimal(65000),
      method: PaymentMethod.E_WALLET,
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-race',
      failureReason: null,
      createdAt: new Date('2026-10-22T00:00:00.000Z'),
      requestHash: validRequestHash,
      order: {
        userId: 'user-1',
      },
    };

    prismaMock.payment.findUnique.mockResolvedValueOnce(racePayment);

    const result = await service.createPayment(
      'user-1',
      'idem-key-1',
      validDto,
    );

    expect(result.id).toBe('pay-race');
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result).not.toHaveProperty('order');
    expectIngredientStockUnchanged();
  });

  it('throws ConflictException when the same idempotency key is submitted with a different payload', async () => {
    const existing = {
      id: 'pay-1',
      orderId: 'order-1',
      requestHash: 'different-hash',
      status: PaymentStatus.SUCCESS,
      order: {
        userId: 'user-1',
      },
    };

    prismaMock.payment.findUnique.mockResolvedValue(existing);

    await expect(
      service.createPayment('user-1', 'idem-key-1', validDto),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('returns NotFoundException when the payment belongs to another user', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      requestHash: validRequestHash,
      status: PaymentStatus.SUCCESS,
      order: {
        userId: 'another-user',
      },
    });

    await expect(
      service.createPayment('user-1', 'idem-key-1', validDto),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('rejects a missing idempotency key without changing ingredient stock', async () => {
    await expect(
      service.createPayment('user-1', '   ', validDto),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('allows payment in production and defaults to SUCCESS when no outcome is provided', async () => {
    const prodConfig = new ConfigService({
      NODE_ENV: 'production',
    });

    const prodGateway = new MockGatewayService(prodConfig);

    const prodService = new PaymentsService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
      loyaltyServiceMock as unknown as LoyaltyService,
      prodGateway,
      vnpayGatewayMock as unknown as VnpayGatewayService,
    );

    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-prod',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    tx.payment.update.mockResolvedValue({
      id: 'pay-prod',
      orderId: 'order-1',
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-prod',
    });

    const result = await prodService.createPayment(
      'user-1',
      'idem-prod-1',
      validDto,
      'FAILED',
    );

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-1',
      OrderStatus.PAID,
      expect.anything(),
    );

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expectIngredientStockUnchanged();
  });

  it('returns a lean payment response without internal fields', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });

    const createdAt = new Date('2026-10-22T00:00:00.000Z');

    tx.payment.update.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      amount: new Prisma.Decimal(65000),
      method: PaymentMethod.E_WALLET,
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-1',
      failureReason: null,
      createdAt,
      idempotencyKey: 'idem-key-1',
      requestHash: 'some-hash',
      order: { id: 'order-1' },
    });

    const result = await service.createPayment(
      'user-1',
      'idem-key-1',
      validDto,
      'SUCCESS',
    );

    expect(result).toEqual({
      id: 'pay-1',
      orderId: 'order-1',
      amount: new Prisma.Decimal(65000),
      method: PaymentMethod.E_WALLET,
      gateway: undefined,
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-1',
      gatewayTransactionNo: undefined,
      paymentUrl: undefined,
      failureReason: null,
      createdAt,
    });

    expect(result).not.toHaveProperty('idempotencyKey');
    expect(result).not.toHaveProperty('requestHash');
    expect(result).not.toHaveProperty('order');
    expectIngredientStockUnchanged();
  });

  // ==========================================
  // VNPAY TEST DATA
  // ==========================================

  const vnpayDto = {
    orderId: 'order-vnpay-1',
    method: PaymentMethod.BANK_CARD,
    gateway: PaymentGateway.VNPAY,
  };

  const validVnpayParams = {
    vnp_TxnRef: 'pay-vnpay-1',
    vnp_Amount: '6500000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: '12345678',
  };

  const vnpayPayment = {
    id: 'pay-vnpay-1',
    orderId: 'order-vnpay-1',
    amount: new Prisma.Decimal(65000),
    method: PaymentMethod.BANK_CARD,
    gateway: PaymentGateway.VNPAY,
    status: PaymentStatus.PENDING,
    transactionRef: 'pay-vnpay-1',
    order: {
      id: 'order-vnpay-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    },
  };

  // ==========================================
  // VNPAY CREATE PAYMENT TEST
  // ==========================================

  it('creates VNPay payment with correct order information and keeps Payment and Order PENDING', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    tx.order.findUnique.mockResolvedValue({
      id: 'order-vnpay-1',
      orderNumber: 1001,
      userId: 'user-1',
      status: OrderStatus.PENDING,
      finalAmount: new Prisma.Decimal(65000),
    });

    tx.payment.create.mockResolvedValue({
      id: 'pay-vnpay-1',
      orderId: 'order-vnpay-1',
      status: PaymentStatus.PENDING,
    });

    vnpayGatewayMock.createPaymentUrl.mockReturnValue(
      'https://sandbox.vnpayment.vn/payment?test=123',
    );

    tx.payment.update.mockResolvedValue({
      id: 'pay-vnpay-1',
      orderId: 'order-vnpay-1',
      amount: new Prisma.Decimal(65000),
      method: PaymentMethod.BANK_CARD,
      gateway: PaymentGateway.VNPAY,
      status: PaymentStatus.PENDING,
      transactionRef: 'pay-vnpay-1',
      gatewayTransactionNo: null,
      paymentUrl: 'https://sandbox.vnpayment.vn/payment?test=123',
      failureReason: null,
      createdAt: new Date('2026-10-31T00:00:00.000Z'),
    });

    const result = await service.createPayment(
      'user-1',
      'vnpay-idem-1',
      vnpayDto,
      undefined,
      '127.0.0.1',
    );

    expect(vnpayGatewayMock.createPaymentUrl).toHaveBeenCalledWith({
      transactionRef: 'pay-vnpay-1',
      amount: 65000,
      orderInfo: 'Thanh toan don hang 1001',
      clientIp: '127.0.0.1',
    });

    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.gateway).toBe(PaymentGateway.VNPAY);
    expect(result.paymentUrl).toBe(
      'https://sandbox.vnpayment.vn/payment?test=123',
    );

    expect(orderServiceMock.transition).not.toHaveBeenCalled();
    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();

    expectIngredientStockUnchanged();
  });

  // ==========================================
  // VNPAY IPN TESTS
  // ==========================================

  it('returns RspCode 97 when VNPay IPN signature is invalid', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(false);

    const result = await service.handleVnpayIpn(
      validVnpayParams,
    );

    expect(result).toEqual({
      RspCode: '97',
      Message: 'Invalid signature',
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('returns RspCode 99 when VNPay IPN is missing required data', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    const result = await service.handleVnpayIpn({
      vnp_TxnRef: 'pay-vnpay-1',
      vnp_Amount: '6500000',
      vnp_ResponseCode: '00',
      // Thiếu vnp_TransactionStatus.
    });

    expect(result).toEqual({
      RspCode: '99',
      Message: 'Invalid payment data',
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('returns RspCode 01 when VNPay transaction reference does not exist', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue(null);

    const result = await service.handleVnpayIpn(
      validVnpayParams,
    );

    expect(result).toEqual({
      RspCode: '01',
      Message: 'Order not found',
    });

    expect(tx.payment.findFirst).toHaveBeenCalledWith({
      where: {
        transactionRef: 'pay-vnpay-1',
        gateway: PaymentGateway.VNPAY,
      },
      include: {
        order: true,
      },
    });

    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expectIngredientStockUnchanged();
  });

  it('returns RspCode 04 when VNPay payment amount does not match', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue(vnpayPayment);

    const result = await service.handleVnpayIpn({
      ...validVnpayParams,
      vnp_Amount: '5000000',
    });

    expect(result).toEqual({
      RspCode: '04',
      Message: 'Invalid amount',
    });

    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(orderServiceMock.transition).not.toHaveBeenCalled();
    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();

    expectIngredientStockUnchanged();
  });

  it('returns RspCode 02 when VNPay payment has already been processed', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue({
      ...vnpayPayment,
      status: PaymentStatus.SUCCESS,
    });

    const result = await service.handleVnpayIpn(
      validVnpayParams,
    );

    expect(result).toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });

    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(orderServiceMock.transition).not.toHaveBeenCalled();
    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();

    expectIngredientStockUnchanged();
  });

  it('confirms successful VNPay payment, transitions Order to PAID and awards loyalty', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue(vnpayPayment);
    tx.payment.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.handleVnpayIpn(
      validVnpayParams,
    );

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pay-vnpay-1',
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayTransactionNo: '12345678',
        failureReason: null,
      },
    });

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-vnpay-1',
      OrderStatus.PAID,
      expect.objectContaining({
        changedBy: 'user-1',
        reason: 'Thanh toán VNPay thành công',
      }),
    );

    expect(loyaltyServiceMock.award).toHaveBeenCalledWith(
      tx,
      {
        id: 'order-vnpay-1',
        userId: 'user-1',
        finalAmount: 65000,
      },
    );

    expect(result).toEqual({
      RspCode: '00',
      Message: 'Confirm Success',
    });

    expectIngredientStockUnchanged();
  });

  it('confirms failed VNPay payment, transitions Order to PAYMENT_FAILED without awarding loyalty', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue(vnpayPayment);
    tx.payment.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.handleVnpayIpn({
      ...validVnpayParams,
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '24',
    });

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pay-vnpay-1',
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
        gatewayTransactionNo: '12345678',
        failureReason:
          'VNPay response: 24, transaction status: 24',
      },
    });

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-vnpay-1',
      OrderStatus.PAYMENT_FAILED,
      expect.objectContaining({
        changedBy: 'user-1',
        reason: 'Thanh toán VNPay thất bại',
      }),
    );

    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();

    expect(result).toEqual({
      RspCode: '00',
      Message: 'Confirm Success',
    });

    expectIngredientStockUnchanged();
  });

  it('does not process VNPay IPN again when another request has already updated the payment', async () => {
    vnpayGatewayMock.verifyIpnSignature.mockReturnValue(true);

    tx.payment.findFirst.mockResolvedValue(vnpayPayment);

    // Một IPN khác đã cập nhật Payment trước request này.
    tx.payment.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await service.handleVnpayIpn(
      validVnpayParams,
    );

    expect(result).toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });

    expect(orderServiceMock.transition).not.toHaveBeenCalled();
    expect(loyaltyServiceMock.award).not.toHaveBeenCalled();

    expectIngredientStockUnchanged();
  });
});
