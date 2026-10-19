import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class PricingService {
  async calculate(
    items: {
      productId: string;
      size: string;
      toppingIds: string[];
      quantity: number;
    }[],
  ): Promise<{
    lines: { productId: string; unitPrice: number; lineTotal: number }[];
    subtotal: number;
  }> {
    throw new NotImplementedException();
  }
}
