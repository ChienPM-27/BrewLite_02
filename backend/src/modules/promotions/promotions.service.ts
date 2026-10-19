import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class PromotionsService {
  async validate(
    code: string | undefined,
    totalAmount: number,
  ): Promise<{ promotionId: string; discountAmount: number } | null> {
    throw new NotImplementedException();
  }
}
