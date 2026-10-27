import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface IngredientDemand {
  ingredientId: string;
  quantity: number;
}

export interface IngredientUsage {
  ingredientId: string;
  quantity: number;
}

/**
 * Trừ kho nguyên liệu nguyên tử theo Change Request CR-01 (Quyết định D10).
 *
 * Quy trình xử lý:
 * 1. Gom các dòng trùng lặp `ingredientId` thành tổng số lượng cần thiết.
 * 2. Lọc bỏ các phần tử có `quantity <= 0`.
 * 3. Sắp xếp danh sách `ingredientId` theo thứ tự tăng dần (alphabet) để phòng tránh Deadlock giữa các transaction song song.
 * 4. Chạy truy vấn cập nhật có điều kiện nguyên tử:
 *    `UPDATE ingredients SET stock = stock - :qty WHERE id = :id AND stock >= :qty AND is_available = true`
 * 5. Nếu `count === 0` (tồn kho không đủ hoặc nguyên liệu không tồn tại / ngừng kinh doanh):
 *    Truy vấn lấy tên nguyên liệu (hoặc id nếu không tìm thấy) và ném `BadRequestException`.
 *
 * @param tx - Prisma Transaction Client
 * @param needs - Danh sách nhu cầu nguyên liệu cần trừ
 * @throws BadRequestException khi nguyên liệu không đủ số lượng tồn kho hoặc không tồn tại
 */
export async function deductIngredients(
  tx: Prisma.TransactionClient,
  needs: Array<IngredientDemand>,
): Promise<void> {
  if (!needs || needs.length === 0) {
    return;
  }

  // 1. Gom trùng lặp ingredientId và lọc bỏ số lượng <= 0
  const demandMap = new Map<string, number>();
  for (const item of needs) {
    if (item && item.ingredientId && item.quantity > 0) {
      const current = demandMap.get(item.ingredientId) ?? 0;
      demandMap.set(item.ingredientId, current + item.quantity);
    }
  }

  if (demandMap.size === 0) {
    return;
  }

  // 2. Sắp xếp ingredientId tăng dần để chống Deadlock
  const sortedIngredientIds = Array.from(demandMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  // 3. Thực thi cập nhật có điều kiện từng nguyên liệu
  for (const ingredientId of sortedIngredientIds) {
    const qty = demandMap.get(ingredientId)!;

    const result = await tx.ingredient.updateMany({
      where: {
        id: ingredientId,
        stock: { gte: qty },
        isAvailable: true,
      },
      data: {
        stock: { decrement: qty },
      },
    });

    if (result.count === 0) {
      // Tìm tên nguyên liệu để trả về thông báo lỗi thân thiện cho khách
      const ing = await tx.ingredient.findUnique({
        where: { id: ingredientId },
        select: { name: true },
      });

      const ingredientName = ing?.name ?? ingredientId;
      throw new BadRequestException(
        `Nguyên liệu "${ingredientName}" không đủ số lượng tồn kho.`,
      );
    }
  }
}

/**
 * Hoàn trả kho nguyên liệu từ snapshot OrderIngredientUsage khi hủy đơn (POST /orders/:id/cancel).
 *
 * Quy trình xử lý:
 * 1. Kiểm tra danh sách, nếu rỗng thì không làm gì (hỗ trợ tương thích ngược với đơn tạo trước migration).
 * 2. Gom trùng lặp và loại bỏ `quantity <= 0`.
 * 3. Sắp xếp danh sách `ingredientId` tăng dần để giữ tính nhất quán transaction.
 * 4. Tăng số lượng tồn kho `stock: { increment: qty }` cho từng nguyên liệu.
 *
 * @param tx - Prisma Transaction Client
 * @param usages - Danh sách snapshot nguyên liệu đã sử dụng cần hoàn trả
 */
export async function restoreIngredients(
  tx: Prisma.TransactionClient,
  usages: Array<IngredientUsage>,
): Promise<void> {
  if (!usages || usages.length === 0) {
    return;
  }

  // 1. Gom trùng lặp và loại bỏ số lượng <= 0
  const restoreMap = new Map<string, number>();
  for (const item of usages) {
    if (item && item.ingredientId && item.quantity > 0) {
      const current = restoreMap.get(item.ingredientId) ?? 0;
      restoreMap.set(item.ingredientId, current + item.quantity);
    }
  }

  if (restoreMap.size === 0) {
    return;
  }

  // 2. Sắp xếp tăng dần
  const sortedIds = Array.from(restoreMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  // 3. Hoàn kho từng nguyên liệu
  for (const ingredientId of sortedIds) {
    const qty = restoreMap.get(ingredientId)!;
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        stock: { increment: qty },
      },
    });
  }
}
