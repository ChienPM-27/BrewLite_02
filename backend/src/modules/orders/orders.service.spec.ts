
//file test chuyen trang thai, kiem tra state machine, optimistic locking va ghi lich su
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProductSize, OrderStatus } from '@prisma/client';

import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { PromotionsService } from '../promotions/promotions.service';

describe('OrdersService.create', () => {
  let service: OrdersService;

  const tx = {
    user: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    topping: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
  };

  const pricingMock = {
    calculate: jest.fn(),
  };

  const promotionsMock = {
    validate: jest.fn(),
  };

  const dto = {
    items: [
      {
        productId: 'product-1',
        size: ProductSize.M,
        quantity: 2,
        toppingIds: ['topping-1'],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    tx.user.findUnique.mockResolvedValue({
      id: 'user-1',
    });

    tx.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Coffee',
        stock: 10,
        version: 2,
      },
    ]);

    tx.topping.findMany.mockResolvedValue([
      {
        id: 'topping-1',
        name: 'Cheese',
        price: 10000,
        stock: 20,
        isAvailable: true,
      },
    ]);

    tx.product.updateMany.mockResolvedValue({ count: 1 });
    tx.topping.updateMany.mockResolvedValue({ count: 1 });

    tx.order.create.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    pricingMock.calculate.mockResolvedValue({
      lines: [
        {
          productId: 'product-1',
          unitPrice: 45000,
          lineTotal: 110000,
        },
      ],
      subtotal: 110000,
    });

    promotionsMock.validate.mockResolvedValue(null);

    service = new OrdersService(
      prismaMock as unknown as PrismaService,
      pricingMock as unknown as PricingService,
      promotionsMock as unknown as PromotionsService,
    );
  });

  it('creates an order and records the initial status', async () => {
    const result = await service.create(
      'user-1',
      dto,
    );

    expect(result).toEqual({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(pricingMock.calculate).toHaveBeenCalledTimes(1);
    expect(promotionsMock.validate).not.toHaveBeenCalled();
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'product-1',
          version: 2,
          stock: { gte: 2 },
        }),
      }),
    );

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrderStatus.PENDING,
          totalAmount: 110000,
          discountAmount: 0,
          finalAmount: 110000,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING,
              changedBy: 'system',
              reason: 'Order created',
            },
          },
        }),
      }),
    );
  });

  it('rejects when the user does not exist', async () => {
    tx.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create('missing-user', dto),
    ).rejects.toThrow(NotFoundException);

    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid promotion code', async () => {
    promotionsMock.validate.mockResolvedValue(null);

    await expect(
      service.create('user-1', {
        ...dto,
        promotionCode: 'INVALID',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects when product stock cannot be reserved', async () => {
    tx.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create('user-1', dto),
    ).rejects.toThrow(BadRequestException);

    expect(tx.order.create).not.toHaveBeenCalled();
  });
});