import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AdminOrdersService } from './admin-orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;

  const txMock = {
    order: { findUnique: jest.fn() },
  };

  const prismaMock = {
    order: { findMany: jest.fn() },
    $transaction: jest.fn((cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  };

  const orderServiceMock = { transition: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOrdersService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
    );
  });

  describe('findActive', () => {
    it('only queries PAID/PREPARING/READY, oldest first, max 100', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);

      await service.findActive();

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY],
            },
          },
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
          take: 100,
        }),
      );
    });

    it('maps to the contract shape without prices or email, falling back to "Khách"', async () => {
      const paidAt = new Date('2026-10-30T03:15:22Z');
      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          orderNumber: 1042,
          status: OrderStatus.PAID,
          paidAt,
          user: { fullName: '   ' },
          items: [
            {
              size: 'M',
              quantity: 2,
              product: { name: 'Cà phê Americano' },
              toppings: [
                { topping: { name: 'Kem Cheese' } },
                { topping: { name: 'Trân châu' } },
              ],
            },
          ],
        },
      ]);

      const result = await service.findActive();

      expect(result).toEqual([
        {
          id: 'order-1',
          orderNumber: 1042,
          status: OrderStatus.PAID,
          paidAt,
          customerName: 'Khách',
          items: [
            {
              productName: 'Cà phê Americano',
              size: 'M',
              quantity: 2,
              toppings: ['Kem Cheese', 'Trân châu'],
            },
          ],
        },
      ]);
    });
  });

  describe('advance', () => {
    it.each([
      [OrderStatus.PAID, OrderStatus.PREPARING],
      [OrderStatus.PREPARING, OrderStatus.READY],
      [OrderStatus.READY, OrderStatus.COMPLETED],
    ] as const)(
      '%s -> %s via OrderService.transition with changedBy "admin"',
      async (from, to) => {
        txMock.order.findUnique.mockResolvedValue({
          id: 'order-1',
          status: from,
        });
        orderServiceMock.transition.mockResolvedValue({
          id: 'order-1',
          orderNumber: 1042,
          status: to,
        });

        const result = await service.advance('order-1', from);

        expect(orderServiceMock.transition).toHaveBeenCalledWith(
          txMock,
          'order-1',
          to,
          { changedBy: 'admin' },
        );
        expect(result).toEqual({
          id: 'order-1',
          orderNumber: 1042,
          fromStatus: from,
          status: to,
        });
      },
    );

    it('throws 404 when the order does not exist', async () => {
      txMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.advance('missing', OrderStatus.PAID),
      ).rejects.toThrow(NotFoundException);
      expect(orderServiceMock.transition).not.toHaveBeenCalled();
    });

    it('throws 409 on a double click (status already moved past expectedStatus)', async () => {
      txMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PREPARING,
      });

      await expect(
        service.advance('order-1', OrderStatus.PAID),
      ).rejects.toThrow(ConflictException);
      expect(orderServiceMock.transition).not.toHaveBeenCalled();
    });

    it.each([
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
      OrderStatus.COMPLETED,
    ])('throws 409 for a %s order', async (status) => {
      txMock.order.findUnique.mockResolvedValue({ id: 'order-1', status });

      await expect(
        service.advance('order-1', OrderStatus.READY),
      ).rejects.toThrow(ConflictException);
      expect(orderServiceMock.transition).not.toHaveBeenCalled();
    });

    it('propagates a version conflict from transition() as 409', async () => {
      txMock.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PAID,
      });
      orderServiceMock.transition.mockRejectedValue(
        new ConflictException(
          'Order status changed concurrently. Please retry.',
        ),
      );

      await expect(
        service.advance('order-1', OrderStatus.PAID),
      ).rejects.toThrow(ConflictException);
    });
  });
});
