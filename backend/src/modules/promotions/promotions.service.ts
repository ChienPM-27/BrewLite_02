// Chữ ký PromotionsService.validate(code: string, totalAmount: number) theo docs/order/api-contract.md
import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class PromotionsService {
  async validate(code: string, totalAmount: number): Promise<any> {
    throw new NotImplementedException();
  }
}
