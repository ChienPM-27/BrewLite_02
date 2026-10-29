//file test chuyen trang thai, kiem tra state machine, optimistic locking va ghi lich su
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    },
    topping: {
      findMany: jest.fn(),
    },
    productRecipe: {
      findMany: jest.fn(),
    },
    toppingRecipe: {
      findMany: jest.fn(),
    },
    ingredient: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    orderIngredientUsage: {
      createMany: jest.fn(),
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

    // Sản phẩm: không còn mock stock/version cũ.
    tx.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Coffee',
      },
    ]);

    // Topping: vẫn cần tên và giá để tạo OrderItemTopping.
    tx.topping.findMany.mockResolvedValue([
      {
        id: 'topping-1',
        name: 'Cheese',
        price: 10000,
        isAvailable: true,
      },
    ]);

    // Công thức nguyên liệu của sản phẩm theo size.
    tx.productRecipe.findMany.mockResolvedValue([
      {
        productId: 'product-1',
        size: ProductSize.M,
        ingredientId: 'ing-coffee',
        quantity: 25,
      },
    ]);

    // Công thức nguyên liệu của topping.
    tx.toppingRecipe.findMany.mockResolvedValue([
      {
        toppingId: 'topping-1',
        ingredientId: 'ing-cheese',
        quantity: 40,
      },
    ]);

    // Helper trừ kho nguyên liệu.
    tx.ingredient.updateMany.mockResolvedValue({ count: 1 });

    tx.ingredient.findUnique.mockResolvedValue({
      name: 'Hạt cà phê Robusta',
    });

    // Lưu snapshot nguyên liệu sau khi tạo đơn.
    tx.orderIngredientUsage.createMany.mockResolvedValue({
      count: 2,
    });

    tx.order.create.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    // Giữ nguyên mock PricingService.
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
    const result = await service.create('user-1', dto);

    expect(result).toEqual({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(pricingMock.calculate).toHaveBeenCalledTimes(1);
    expect(promotionsMock.validate).not.toHaveBeenCalled();

    // Xác nhận đã đọc công thức của món và topping.
    expect(tx.productRecipe.findMany).toHaveBeenCalledWith({
      where: {
        productId: { in: ['product-1'] },
      },
    });

    expect(tx.toppingRecipe.findMany).toHaveBeenCalledWith({
      where: {
        toppingId: { in: ['topping-1'] },
      },
    });

    // Hai nguyên liệu được trừ theo thứ tự ingredientId tăng dần.
    expect(tx.ingredient.updateMany).toHaveBeenCalledTimes(2);

    expect(tx.ingredient.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'ing-cheese',
        stock: { gte: 80 },
        isAvailable: true,
      },
      data: {
        stock: { decrement: 80 },
      },
    });

    expect(tx.ingredient.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'ing-coffee',
        stock: { gte: 50 },
        isAvailable: true,
      },
      data: {
        stock: { decrement: 50 },
      },
    });

    // Đơn vẫn phải được tạo với trạng thái và giá tiền đúng.
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

    // Snapshot phải ghi đúng lượng nguyên liệu đã trừ.
    expect(tx.orderIngredientUsage.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: 'order-1',
          ingredientId: 'ing-cheese',
          quantity: 80,
        },
        {
          orderId: 'order-1',
          ingredientId: 'ing-coffee',
          quantity: 50,
        },
      ],
    });
  });

  it('rejects when the user does not exist', async () => {
    tx.user.findUnique.mockResolvedValue(null);

    await expect(service.create('missing-user', dto)).rejects.toThrow(
      NotFoundException,
    );

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

  it('rejects when ingredient stock is insufficient', async () => {
    // Helper sắp xếp ID nên ing-cheese được xử lý đầu tiên.
    tx.ingredient.updateMany.mockResolvedValueOnce({ count: 0 });

    tx.ingredient.findUnique.mockResolvedValueOnce({
      name: 'Kem Cheese',
    });

    await expect(service.create('user-1', dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(tx.ingredient.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.orderIngredientUsage.createMany).not.toHaveBeenCalled();
  });

  it('rejects when product recipe is missing for the requested size', async () => {
    tx.productRecipe.findMany.mockResolvedValue([]);

    await expect(service.create('user-1', dto)).rejects.toThrow(
      'Món "Coffee" (size M) chưa có công thức nguyên liệu.',
    );

    expect(tx.ingredient.updateMany).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.orderIngredientUsage.createMany).not.toHaveBeenCalled();
  });

  it('rejects when topping recipe is missing', async () => {
    tx.toppingRecipe.findMany.mockResolvedValue([]);

    await expect(service.create('user-1', dto)).rejects.toThrow(
      'Topping "Cheese" chưa có công thức nguyên liệu.',
    );

    expect(tx.ingredient.updateMany).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.orderIngredientUsage.createMany).not.toHaveBeenCalled();
  });

  it('aggregates product and topping demand for the same ingredient', async () => {
    tx.productRecipe.findMany.mockResolvedValue([
      {
        productId: 'product-1',
        size: ProductSize.M,
        ingredientId: 'ing-shared',
        quantity: 25,
      },
    ]);

    tx.toppingRecipe.findMany.mockResolvedValue([
      {
        toppingId: 'topping-1',
        ingredientId: 'ing-shared',
        quantity: 40,
      },
    ]);

    tx.ingredient.updateMany.mockResolvedValue({ count: 1 });

    await service.create('user-1', dto);

    // Món chính: 25 * 2 = 50
    // Topping:   40 * 2 = 80
    // Tổng cộng: 130
    expect(tx.ingredient.updateMany).toHaveBeenCalledTimes(1);

    expect(tx.ingredient.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ing-shared',
        stock: { gte: 130 },
        isAvailable: true,
      },
      data: {
        stock: { decrement: 130 },
      },
    });

    expect(tx.orderIngredientUsage.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: 'order-1',
          ingredientId: 'ing-shared',
          quantity: 130,
        },
      ],
    });
  });
});
