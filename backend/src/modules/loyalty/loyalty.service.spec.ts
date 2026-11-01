import { LoyaltyService } from './loyalty.service';
import { Prisma } from '@prisma/client';

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  const tx = {
    loyaltyTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  };

  const order = {
    id: 'order-001',
    userId: 'user-001',
    finalAmount: 50000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LoyaltyService();
  });

  it('chỉ cộng điểm một lần khi gọi award hai lần', async () => {
    // Lần gọi đầu: chưa có lịch sử tích điểm.
    // Lần gọi sau: đã có lịch sử tích điểm.
    tx.loyaltyTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'loyalty-001' });

    await service.award(
      tx as unknown as Prisma.TransactionClient,
      order,
    );

    await service.award(
      tx as unknown as Prisma.TransactionClient,
      order,
    );

    // Chỉ ghi lịch sử tích điểm một lần.
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledTimes(1);

    // Chỉ cộng điểm cho tài khoản một lần.
    expect(tx.user.update).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-001' },
      data: { loyaltyPoints: { increment: 50 } },
    });

    // Chỉ cập nhật điểm của đơn hàng một lần.
    expect(tx.order.update).toHaveBeenCalledTimes(1);
  });
});