// Chữ ký OrderService.transition(orderId: string, to: string) theo docs/order/state-machine.md và docs/order/api-contract.md
import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class OrderService {
  async transition(orderId: string, to: string): Promise<any> {
    throw new NotImplementedException();
  }
}
