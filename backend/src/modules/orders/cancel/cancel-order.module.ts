import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders.module';
import { CancelOrderController } from './cancel-order.controller';
import { CancelOrderService } from './cancel-order.service';

/**
 * Sub-module hủy đơn. Import OrdersModule để dùng chung instance
 * `OrderService` (nơi duy nhất được ghi Order.status).
 * Cần được thêm vào `imports` của AppModule (file của Chiến).
 */
@Module({
  imports: [OrdersModule],
  controllers: [CancelOrderController],
  providers: [CancelOrderService],
})
export class CancelOrderModule {}
