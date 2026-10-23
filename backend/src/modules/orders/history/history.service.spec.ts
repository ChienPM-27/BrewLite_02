import { NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { HistoryService } from './history.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('HistoryService', () => {
  let service: HistoryService;

  const prismaMock = {
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HistoryService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns paginated order history for the authenticated user', async () => {
      prismaMock.order.count.mockResolvedValue(2);
      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'order-2',
          orderNumber: 2,
          status: OrderStatus.PAID,
          totalAmount: new Prisma.Decimal(100000),
          discountAmount: new Prisma.Decimal(0),
          finalAmount: new Prisma.Decimal(100000),
          createdAt: new Date('2026-10-23T10:00:00Z'),
          items: [{ quantity: 2 }, { quantity: 1 }],
        },
        {
          id: 'order-1',
          orderNumber: 1,
          status: OrderStatus.COMPLETED,
          totalAmount: new Prisma.Decimal(50000),
          discountAmount: new Prisma.Decimal(0),
          finalAmount: new Prisma.Decimal(50000),
          createdAt: new Date('2026-10-23T09:00:00Z'),
          items: [{ quantity: 1 }],
        },
      ]);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
        select: expect.any(Object),
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].itemCount).toBe(3); // 2 + 1
      expect(result.items[1].itemCount).toBe(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
      });
    });

    it('filters orders by status when status query parameter is provided', async () => {
      prismaMock.order.count.mockResolvedValue(1);
      prismaMock.order.findMany.mockResolvedValue([
        {
          id: 'order-3',
          orderNumber: 3,
          status: OrderStatus.PENDING,
          totalAmount: new Prisma.Decimal(45000),
          discountAmount: new Prisma.Decimal(0),
          finalAmount: new Prisma.Decimal(45000),
          createdAt: new Date('2026-10-23T11:00:00Z'),
          items: [{ quantity: 1 }],
        },
      ]);

      const result = await service.findAll('user-1', {
        page: 1,
        limit: 20,
        status: OrderStatus.PENDING,
      });

      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: OrderStatus.PENDING },
      });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: OrderStatus.PENDING },
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(OrderStatus.PENDING);
    });

    it('handles hasNextPage correctly when multiple pages exist', async () => {
      prismaMock.order.count.mockResolvedValue(25);
      prismaMock.order.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
      });
    });

    it('returns empty list and zero pages when user has no orders', async () => {
      prismaMock.order.count.mockResolvedValue(0);
      prismaMock.order.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-new');

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      });
    });
  });

  describe('findOne', () => {
    it('returns order details with items and toppings for the owner', async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 1,
        status: OrderStatus.PAID,
        totalAmount: new Prisma.Decimal(55000),
        discountAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(55000),
        paidAt: new Date('2026-10-23T10:05:00Z'),
        createdAt: new Date('2026-10-23T10:00:00Z'),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            size: 'M',
            quantity: 1,
            unitPrice: new Prisma.Decimal(45000),
            lineTotal: new Prisma.Decimal(55000),
            product: { name: 'Cà phê sữa đá' },
            toppings: [
              {
                id: 'oit-1',
                toppingId: 'top-1',
                price: new Prisma.Decimal(10000),
                topping: { name: 'Kem Cheese' },
              },
            ],
          },
        ],
        payments: [
          {
            id: 'pay-1',
            method: 'E_WALLET',
            status: 'SUCCESS',
            transactionRef: 'MOCK-pay-1',
            createdAt: new Date('2026-10-23T10:05:00Z'),
          },
        ],
      });

      const result = await service.findOne('user-1', 'order-1');

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-1' },
        select: expect.any(Object),
      });

      expect(result.id).toBe('order-1');
      expect(result.items[0].name).toBe('Cà phê sữa đá');
      expect(result.items[0].toppings[0].name).toBe('Kem Cheese');
      expect(result.payments).toHaveLength(1);
    });

    it('throws NotFoundException when order does not exist or belongs to another user', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-other', 'order-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-other' },
        select: expect.any(Object),
      });
    });
  });
});
