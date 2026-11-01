
import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { MockGatewayService } from './mock-gateway.service';
import { VnpayGatewayService } from './vnpay/vnpay-gateway.service';

import { OrdersModule } from '../orders/orders.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    OrdersModule,
    LoyaltyModule,
  ],
  controllers: [
    PaymentsController,
  ],
  providers: [
    PaymentsService,
    MockGatewayService,
    VnpayGatewayService,
  ],
  exports: [
    PaymentsService,
  ],
})
export class PaymentsModule {}
