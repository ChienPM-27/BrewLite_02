import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, Injectable} from '@nestjs/common';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}
  async validate(
    code: string | undefined,
    totalAmount: number,
  ): Promise<{ promotionId: string; discountAmount: number } | null> {

    if (!code?.trim()) return null;
    
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw new BadRequestException("Tổng tiền đơn hàng không hợp lệ!");
    }

    const normalizedCode = code.trim().toUpperCase();
    const promotion = await this.prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });
    if (!promotion || !promotion.isActive) {
      throw new BadRequestException("Mã giảm giá không hợp lệ.");
    }

    const now = new Date();
    if (now < promotion.startDate) {
      throw new BadRequestException("Mã giảm giá chưa đến thời gian áp dụng.");
    }
    if (promotion.endDate && now > promotion.endDate) {
      throw new BadRequestException("Mã giảm giá đã hết hạn.");
    }

    const minOrderAmount = Number(promotion.minOrderAmount);
    if (totalAmount < minOrderAmount) {
      throw new BadRequestException(
        `Đơn hàng phải đạt tối thiểu ${minOrderAmount}đ để sử dụng mã này.`,
      );
    }

    const hasPercent = promotion.discountPercent !== null;
    const hasFixedAmount = promotion.discountAmount !== null;
    if (!hasPercent && !hasFixedAmount) {
      throw new BadRequestException("Mã giảm giá chưa được cấu hình mức giảm.");
    }
    let discount = hasPercent
      ? Math.floor((totalAmount * promotion.discountPercent!) / 100)
      : Number(promotion.discountAmount);

    // Áp dụng mức giảm tối đa nếu có.
    if (promotion.maxDiscount !== null) {
      discount = Math.min(discount, Number(promotion.maxDiscount));
    }

    // Không giảm quá tổng tiền đơn hàng.
    discount = Math.max(0, Math.min(discount, totalAmount));

    return {
      promotionId: promotion.id,
      discountAmount: discount,
    };
  }
}
