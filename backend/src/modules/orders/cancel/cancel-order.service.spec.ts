import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { CancelOrderService } from './cancel-order.service';
import { OrderService } from '../order.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CancelOrderService', () => {
  let service: CancelOrderService;

  const mockTx = {
    order: {
      findUnique: jest.fn(),
    },
    orderIngredientUsage: {
      findMany: jest.fn(),
    },
    ingredient: {
      update: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    topping: {
      update: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
  };

  const orderServiceMock = {
    transition: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx),
    );

    service = new CancelOrderService(
      prismaMock as unknown as PrismaService,
      orderServiceMock as unknown as OrderService,
    );
  });

  describe('cancel', () => {
    const orderId = 'order-123';
    const userId = 'user-owner';

    it('hủy đơn PENDING thành công và hoàn trả nguyên liệu theo snapshot', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
      });

      orderServiceMock.transition.mockResolvedValue({
        id: orderId,
        orderNumber: 1001,
        status: OrderStatus.CANCELLED,
      });

      mockTx.orderIngredientUsage.findMany.mockResolvedValue([
        { id: 'usage-1', orderId, ingredientId: 'ing-coffee', quantity: 30 },
        { id: 'usage-2', orderId, ingredientId: 'ing-milk', quantity: 150 },
      ]);

      mockTx.ingredient.update.mockResolvedValue({});

      const result = await service.cancel(orderId, userId);

      // 1. Kiểm tra kết quả trả về
      expect(result).toEqual({
        id: orderId,
        orderNumber: 1001,
        status: OrderStatus.CANCELLED,
      });

      // 2. Chuyển trạng thái sang CANCELLED
      expect(orderServiceMock.transition).toHaveBeenCalledWith(
        mockTx,
        orderId,
        OrderStatus.CANCELLED,
        { changedBy: userId, reason: 'Customer cancelled' },
      );

      // 3. Lấy snapshot từ bảng orderIngredientUsage
      expect(mockTx.orderIngredientUsage.findMany).toHaveBeenCalledWith({
        where: { orderId },
      });

      // 4. Hoàn kho nguyên liệu đúng từng loại theo snapshot (ing-coffee trước, ing-milk sau do sắp xếp ID)
      expect(mockTx.ingredient.update).toHaveBeenCalledTimes(2);
      expect(mockTx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-coffee' },
        data: { stock: { increment: 30 } },
      });
      expect(mockTx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-milk' },
        data: { stock: { increment: 150 } },
      });

      // 5. Đảm bảo logic kho cũ (Product.stock, Topping.stock) hoàn toàn không được gọi
      expect(mockTx.product.update).not.toHaveBeenCalled();
      expect(mockTx.topping.update).not.toHaveBeenCalled();
    });

    it('hủy đơn PAYMENT_FAILED thành công và hoàn nguyên liệu theo snapshot', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PAYMENT_FAILED,
      });

      orderServiceMock.transition.mockResolvedValue({
        id: orderId,
        orderNumber: 1002,
        status: OrderStatus.CANCELLED,
      });

      mockTx.orderIngredientUsage.findMany.mockResolvedValue([
        { id: 'usage-1', orderId, ingredientId: 'ing-tea', quantity: 20 },
      ]);

      mockTx.ingredient.update.mockResolvedValue({});

      const result = await service.cancel(orderId, userId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockTx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-tea' },
        data: { stock: { increment: 20 } },
      });
    });

    it('tương thích ngược: đơn cũ không có snapshot (usages rỗng) thì hủy thành công, không ném 500', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
      });

      orderServiceMock.transition.mockResolvedValue({
        id: orderId,
        orderNumber: 1003,
        status: OrderStatus.CANCELLED,
      });

      // Đơn cũ không có snapshot usages
      mockTx.orderIngredientUsage.findMany.mockResolvedValue([]);

      const result = await service.cancel(orderId, userId);

      expect(result).toEqual({
        id: orderId,
        orderNumber: 1003,
        status: OrderStatus.CANCELLED,
      });

      // Bỏ qua hoàn kho nguyên liệu, không cập nhật bảng ingredient
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
      expect(mockTx.product.update).not.toHaveBeenCalled();
      expect(mockTx.topping.update).not.toHaveBeenCalled();
    });

    it('ném NotFoundException (404) khi đơn hàng không tồn tại', async () => {
      mockTx.order.findUnique.mockResolvedValue(null);

      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        'Không tìm thấy đơn hàng',
      );

      expect(orderServiceMock.transition).not.toHaveBeenCalled();
      expect(mockTx.orderIngredientUsage.findMany).not.toHaveBeenCalled();
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('ném NotFoundException (404) khi người dùng không phải là chủ sở hữu đơn hàng', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId: 'other-user',
        status: OrderStatus.PENDING,
      });

      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        'Không tìm thấy đơn hàng',
      );

      expect(orderServiceMock.transition).not.toHaveBeenCalled();
      expect(mockTx.orderIngredientUsage.findMany).not.toHaveBeenCalled();
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('ném ConflictException (409) khi đơn hàng ở trạng thái không thể hủy (PAID, PREPARING, ...)', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PAID,
      });

      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        'Đơn hàng ở trạng thái PAID không thể hủy',
      );

      expect(orderServiceMock.transition).not.toHaveBeenCalled();
      expect(mockTx.orderIngredientUsage.findMany).not.toHaveBeenCalled();
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('ném ConflictException (409) khi cố tình hủy lần 2 trên đơn đã CANCELLED (tránh double-refund)', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.CANCELLED,
      });

      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        'Đơn hàng ở trạng thái CANCELLED không thể hủy',
      );

      // Đảm bảo không gọi transition và không hoàn kho lần 2
      expect(orderServiceMock.transition).not.toHaveBeenCalled();
      expect(mockTx.orderIngredientUsage.findMany).not.toHaveBeenCalled();
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('lan truyền ConflictException (409) khi transition gặp xung đột đồng thời (optimistic locking)', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
      });

      orderServiceMock.transition.mockRejectedValue(
        new ConflictException(
          'Order status changed concurrently. Please retry.',
        ),
      );

      await expect(service.cancel(orderId, userId)).rejects.toThrow(
        ConflictException,
      );

      // Đảm bảo không lấy usages hoặc hoàn kho khi transition thất bại
      expect(mockTx.orderIngredientUsage.findMany).not.toHaveBeenCalled();
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('hoàn trả chính xác khi snapshot quantity có kiểu Prisma.Decimal', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
      });

      orderServiceMock.transition.mockResolvedValue({
        id: orderId,
        orderNumber: 1004,
        status: OrderStatus.CANCELLED,
      });

      mockTx.orderIngredientUsage.findMany.mockResolvedValue([
        {
          id: 'usage-1',
          orderId,
          ingredientId: 'ing-coffee',
          quantity: new Prisma.Decimal(25),
        },
      ]);

      mockTx.ingredient.update.mockResolvedValue({});

      const result = await service.cancel(orderId, userId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockTx.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-coffee' },
        data: { stock: { increment: 25 } },
      });
    });
  });
});
