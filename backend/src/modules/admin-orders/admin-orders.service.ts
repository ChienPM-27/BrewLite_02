// Khung do Leader tạo. Logic do Quang Huy hiện thực theo docs/admin-orders/api-contract.md
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}
}
