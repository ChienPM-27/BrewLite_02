import { PromotionsService } from './promotions.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('PromotionsService', () => {
  let service: PromotionsService;

  const prisma = {
    promotion: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PromotionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('không giảm giá vượt quá tổng tiền đơn hàng', async () => {
    prisma.promotion.findUnique.mockResolvedValue({
      id: 'promotion-001',
      code: 'GIAM15K',
      isActive: true,
      startDate: new Date('2026-01-01'),
      endDate: null,
      minOrderAmount: 0,
      discountPercent: null,
      discountAmount: 15000,
      maxDiscount: null,
    });

    const totalAmount = 10000;

    const result = await service.validate('GIAM15K', totalAmount);

    expect(result).toEqual({
      promotionId: 'promotion-001',
      discountAmount: 10000,
    });

    const finalAmount = totalAmount - result!.discountAmount;

    expect(finalAmount).toBeGreaterThanOrEqual(0);
    expect(finalAmount).toBe(0);
  });
});