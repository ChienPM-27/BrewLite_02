import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

import { PaymentsService } from './payments.service';
import { MockGatewayService } from './mock-gateway.service';
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

  beforeEach(() => {
    jest.clearAllMocks();

    configService = new ConfigService({ NODE_ENV: 'development' });
    mockGateway = new MockGatewayService(configService);

    service = new PaymentsService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
      loyaltyServiceMock as unknown as LoyaltyService,
      mockGateway,
    );

    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
  });

  const validDto = {
    orderId: 'order-1',
    method: PaymentMethod.E_WALLET,
  };

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
  });

  it('creates failed payment and transitions PENDING -> PAYMENT_FAILED without awarding loyalty', async () => {
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
  });

  it('retries failed payment with new key: transitions PAYMENT_FAILED -> PENDING -> PAID', async () => {
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
  });

  it('retries failed payment with new key and fails again: transitions PAYMENT_FAILED -> PENDING -> PAYMENT_FAILED', async () => {
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
  });

  it('replays existing payment when same idempotency key and payload are submitted without order relation', async () => {
    const existing = {
      id: 'pay-1',
      orderId: 'order-1',
      requestHash: '92ef20fbae9591ea2f3ac018d1ced42c9bc774534bbe06f64f4689dc435143c9',
      status: PaymentStatus.SUCCESS,
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
    expect(result.id).toBe('pay-1');
    expect(result).not.toHaveProperty('order');
  });

  it('handles concurrency race condition P2002 by replaying existing payment', async () => {
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
      requestHash: '92ef20fbae9591ea2f3ac018d1ced42c9bc774534bbe06f64f4689dc435143c9',
      status: PaymentStatus.SUCCESS,
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
    expect(result).not.toHaveProperty('order');
  });

  it('throws ConflictException when same idempotency key is submitted with different payload', async () => {
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
  });

  it('allows payment in production environment and defaults to SUCCESS', async () => {
    const prodConfig = new ConfigService({ NODE_ENV: 'production' });
    const prodGateway = new MockGatewayService(prodConfig);
    const prodService = new PaymentsService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
      loyaltyServiceMock as unknown as LoyaltyService,
      prodGateway,
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
      'FAILED', // In production, this header should be ignored and outcome should still be SUCCESS
    );

    expect(orderServiceMock.transition).toHaveBeenCalledWith(
      tx,
      'order-1',
      OrderStatus.PAID,
      expect.anything(),
    );

    expect(result.status).toBe(PaymentStatus.SUCCESS);
  });

  it('returns lean payment response without internal fields (idempotencyKey, requestHash, order)', async () => {
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
      status: PaymentStatus.SUCCESS,
      transactionRef: 'MOCK-pay-1',
      failureReason: null,
      createdAt,
    });
    expect(result).not.toHaveProperty('idempotencyKey');
    expect(result).not.toHaveProperty('requestHash');
    expect(result).not.toHaveProperty('order');
  });
});
