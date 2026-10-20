
//file test tao don hang, goi pricing service, promotions service, ....
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

import { OrderService } from './order.service';

describe('OrderService.transition', () => {
  let service: OrderService;

  const tx = {
    order: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    loyaltyTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new OrderService();

    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PAID,
      version: 3,
      finalAmount: 50000,
    });

    tx.order.updateMany.mockResolvedValue({ count: 1 });

    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PREPARING,
      version: 4,
    });
  });

  it('updates status and records history in the supplied transaction', async () => {
    const result = await service.transition(
      tx as unknown as Prisma.TransactionClient,
      'order-1',
      OrderStatus.PREPARING,
      {
        changedBy: 'barista',
        reason: 'Accepted for preparation',
      },
    );

    expect(result.status).toBe(OrderStatus.PREPARING);

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        status: OrderStatus.PAID,
        version: 3,
      },
      data: {
        status: OrderStatus.PREPARING,
        version: { increment: 1 },
      },
    });

    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        fromStatus: OrderStatus.PAID,
        toStatus: OrderStatus.PREPARING,
        changedBy: 'barista',
        reason: 'Accepted for preparation',
      },
    });
  });

  it('throws NotFoundException when the order does not exist', async () => {
    tx.order.findUnique.mockResolvedValue(null);

    await expect(
      service.transition(
        tx as unknown as Prisma.TransactionClient,
        'missing-order',
        OrderStatus.PREPARING,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid state transition', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      version: 3,
      finalAmount: 50000,
    });

    await expect(
      service.transition(
        tx as unknown as Prisma.TransactionClient,
        'order-1',
        OrderStatus.COMPLETED,
      ),
    ).rejects.toThrow(ConflictException);

    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when optimistic locking fails', async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.transition(
        tx as unknown as Prisma.TransactionClient,
        'order-1',
        OrderStatus.PREPARING,
      ),
    ).rejects.toThrow(ConflictException);

    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });
    const validTransitions: Array<[OrderStatus, OrderStatus]> = [
    [OrderStatus.PENDING, OrderStatus.PAID],
    [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED],
    [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING],
    [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
    [OrderStatus.PAID, OrderStatus.PREPARING],
    [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING, OrderStatus.READY],
    [OrderStatus.READY, OrderStatus.COMPLETED],
  ];

  it.each(validTransitions)(
    'allows transition %s -> %s',
    async (fromStatus, toStatus) => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: fromStatus,
        version: 3,
        finalAmount: 50000,
      });

      tx.order.findUniqueOrThrow.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: toStatus,
        version: 4,
      });

      // Tránh kích hoạt nhánh cộng điểm trong test ma trận.
      tx.loyaltyTransaction.findFirst.mockResolvedValue({
        id: 'existing-transaction',
      });

      await service.transition(
        tx as unknown as Prisma.TransactionClient,
        'order-1',
        toStatus,
      );

      expect(tx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'order-1',
            status: fromStatus,
            version: 3,
          },
          data: expect.objectContaining({
            status: toStatus,
            version: { increment: 1 },
          }),
        }),
      );

      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          fromStatus,
          toStatus,
        }),
      });
    },
  );

  it.each([
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ])(
    'rejects transitions out of terminal state %s',
    async (fromStatus) => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        status: fromStatus,
        version: 3,
        finalAmount: 50000,
      });

      await expect(
        service.transition(
          tx as unknown as Prisma.TransactionClient,
          'order-1',
          OrderStatus.PENDING,
        ),
      ).rejects.toThrow(ConflictException);

      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
    },
  );

    it('awards loyalty points when an order transitions to PAID', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      version: 3,
      finalAmount: 50000,
    });

    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.loyaltyTransaction.findFirst.mockResolvedValue(null);
    tx.order.update.mockResolvedValue({});
    tx.user.update.mockResolvedValue({});
    tx.loyaltyTransaction.create.mockResolvedValue({});
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
    });

    await service.transition(
      tx as unknown as Prisma.TransactionClient,
      'order-1',
      OrderStatus.PAID,
    );

    // 50.000đ / 1.000 = 50 điểm
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { pointsEarned: 50 },
    });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        loyaltyPoints: { increment: 50 },
      },
    });

    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        orderId: 'order-1',
        points: 50,
        type: 'EARNED',
        reason: 'Earned 50 points from order order-1',
      },
    });
  });

  it('does not award loyalty points twice for the same order', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      version: 3,
      finalAmount: 50000,
    });

    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.loyaltyTransaction.findFirst.mockResolvedValue({
      id: 'existing-earned-transaction',
    });

    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
    });

    await service.transition(
      tx as unknown as Prisma.TransactionClient,
      'order-1',
      OrderStatus.PAID,
    );

    expect(tx.loyaltyTransaction.findFirst).toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
});