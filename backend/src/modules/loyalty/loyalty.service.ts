import { Injectable, NotImplementedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  // idempotent theo order.id
  async award(
    tx: Prisma.TransactionClient,
    order: { id: string; userId: string; finalAmount: number },
  ): Promise<void> {
    throw new NotImplementedException();
  }
}
