import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PricingModule } from '../pricing/pricing.module';
import { PromotionsModule } from '../promotions/promotions.module';

import { OrderService } from './order.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Get('health')
  healthCheck() {
    return {
      module: 'Orders',
      status: 'Ready for implementation (Task 6)',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(req.user.sub, dto);
  }
}

@Module({
  imports: [PricingModule, PromotionsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderService],
  exports: [OrdersService, OrderService],
})
export class OrdersModule {}
