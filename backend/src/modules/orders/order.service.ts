import { Injectable, NotImplementedException } from '@nestjs/common';
import { Prisma, OrderStatus, Order } from '@prisma/client';

@Injectable()
export class OrderService {
  async transition(
    tx: Prisma.TransactionClient,
    orderId: string,
    to: OrderStatus,
    opts?: { changedBy?: string; reason?: string },
  ): Promise<Order> {
    throw new NotImplementedException();
  }
}
