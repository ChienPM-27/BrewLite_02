// Khung do Leader tạo. Logic do Quang Huy hiện thực theo docs/admin-orders/api-contract.md
import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [OrdersModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
})
export class AdminOrdersModule {}
