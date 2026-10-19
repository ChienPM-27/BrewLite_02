// Chữ ký tối thiểu PricingService.calculate(items: any[]) phục vụ tính giá món và đơn hàng phía server
import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class PricingService {
  async calculate(items: any[]): Promise<any> {
    throw new NotImplementedException();
  }
}
