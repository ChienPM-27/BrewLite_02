import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CancelOrderModule } from './modules/orders/cancel/cancel-order.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    CancelOrderModule,
    PaymentsModule,
    PricingModule,
    PromotionsModule,
    LoyaltyModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
