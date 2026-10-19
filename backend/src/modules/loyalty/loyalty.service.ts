// Chữ ký tối thiểu LoyaltyService.award(userId: string, points: number, orderId?: string) phục vụ cộng điểm loyalty
import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class LoyaltyService {
  async award(userId: string, points: number, orderId?: string): Promise<any> {
    throw new NotImplementedException();
  }
}
