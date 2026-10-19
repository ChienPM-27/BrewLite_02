import { Module, Controller } from '@nestjs/common';
import { OrderService } from './orders.service';

@Controller('orders')
export class OrdersController {}

@Module({
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}
