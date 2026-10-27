import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  deductIngredients,
  restoreIngredients,
  IngredientDemand,
  IngredientUsage,
} from './ingredient-stock.helper';

describe('IngredientStockHelper', () => {
  let mockTx: {
    ingredient: {
      updateMany: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    mockTx = {
      ingredient: {
        updateMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };
  });

  describe('deductIngredients', () => {
    it('nên không làm gì khi mảng needs rỗng hoặc null', async () => {
      await deductIngredients(mockTx as unknown as Prisma.TransactionClient, []);
      await deductIngredients(
        mockTx as unknown as Prisma.TransactionClient,
        null as unknown as IngredientDemand[],
      );
      expect(mockTx.ingredient.updateMany).not.toHaveBeenCalled();
    });

    it('nên bỏ qua các phần tử có quantity <= 0', async () => {
      await deductIngredients(mockTx as unknown as Prisma.TransactionClient, [
        { ingredientId: 'ing-1', quantity: 0 },
        { ingredientId: 'ing-2', quantity: -5 },
      ]);
      expect(mockTx.ingredient.updateMany).not.toHaveBeenCalled();
    });

    it('nên gom trùng lặp ingredientId và sắp xếp theo ID tăng dần để chống deadlock', async () => {
      mockTx.ingredient.updateMany.mockResolvedValue({ count: 1 });

      const needs: IngredientDemand[] = [
        { ingredientId: 'ing-zebra', quantity: 10 },
        { ingredientId: 'ing-apple', quantity: 20 },
        { ingredientId: 'ing-zebra', quantity: 15 }, // tổng ing-zebra = 25
        { ingredientId: 'ing-apple', quantity: 5 }, // tổng ing-apple = 25
        { ingredientId: 'ing-banana', quantity: 12 },
      ];

      await deductIngredients(
        mockTx as unknown as Prisma.TransactionClient,
        needs,
      );

      // Sắp xếp tăng dần: ing-apple -> ing-banana -> ing-zebra
      expect(mockTx.ingredient.updateMany).toHaveBeenCalledTimes(3);

      expect(mockTx.ingredient.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'ing-apple', stock: { gte: 25 }, isAvailable: true },
        data: { stock: { decrement: 25 } },
      });

      expect(mockTx.ingredient.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'ing-banana', stock: { gte: 12 }, isAvailable: true },
        data: { stock: { decrement: 12 } },
      });

      expect(mockTx.ingredient.updateMany).toHaveBeenNthCalledWith(3, {
        where: { id: 'ing-zebra', stock: { gte: 25 }, isAvailable: true },
        data: { stock: { decrement: 25 } },
      });
    });

    it('nên ném BadRequestException kèm tên nguyên liệu khi updateMany.count = 0', async () => {
      mockTx.ingredient.updateMany.mockResolvedValue({ count: 0 });
      mockTx.ingredient.findUnique.mockResolvedValue({
        name: 'Hạt cà phê Robusta',
      });

      await expect(
        deductIngredients(mockTx as unknown as Prisma.TransactionClient, [
          { ingredientId: 'ing-coffee', quantity: 50 },
        ]),
      ).rejects.toThrow(
        new BadRequestException(
          'Nguyên liệu "Hạt cà phê Robusta" không đủ số lượng tồn kho.',
        ),
      );

      expect(mockTx.ingredient.findUnique).toHaveBeenCalledWith({
        where: { id: 'ing-coffee' },
        select: { name: true },
      });
    });

    it('nên ném BadRequestException kèm ID khi nguyên liệu không tìm thấy trong DB', async () => {
      mockTx.ingredient.updateMany.mockResolvedValue({ count: 0 });
      mockTx.ingredient.findUnique.mockResolvedValue(null);

      await expect(
        deductIngredients(mockTx as unknown as Prisma.TransactionClient, [
          { ingredientId: 'unknown-id', quantity: 10 },
        ]),
      ).rejects.toThrow(
        new BadRequestException(
          'Nguyên liệu "unknown-id" không đủ số lượng tồn kho.',
        ),
      );
    });
  });

  describe('restoreIngredients', () => {
    it('nên không làm gì khi usages rỗng hoặc null', async () => {
      await restoreIngredients(mockTx as unknown as Prisma.TransactionClient, []);
      await restoreIngredients(
        mockTx as unknown as Prisma.TransactionClient,
        null as unknown as IngredientUsage[],
      );
      expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('nên gom trùng lặp, sắp xếp tăng dần và gọi update với increment', async () => {
      mockTx.ingredient.update.mockResolvedValue({});

      const usages: IngredientUsage[] = [
        { ingredientId: 'ing-syrup', quantity: 30 },
        { ingredientId: 'ing-tea', quantity: 15 },
        { ingredientId: 'ing-syrup', quantity: 10 }, // tổng 40
        { ingredientId: 'ing-zero', quantity: 0 }, // bỏ qua
      ];

      await restoreIngredients(
        mockTx as unknown as Prisma.TransactionClient,
        usages,
      );

      // Thứ tự tăng dần: ing-syrup -> ing-tea
      expect(mockTx.ingredient.update).toHaveBeenCalledTimes(2);

      expect(mockTx.ingredient.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'ing-syrup' },
        data: { stock: { increment: 40 } },
      });

      expect(mockTx.ingredient.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'ing-tea' },
        data: { stock: { increment: 15 } },
      });
    });
  });
});
