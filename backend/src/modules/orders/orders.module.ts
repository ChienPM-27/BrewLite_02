import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('health')
  healthCheck() {
    return this.ordersService.healthCheck();
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 10 : Number(limit);

    if (
      !Number.isInteger(parsedPage) ||
      !Number.isInteger(parsedLimit) ||
      parsedPage < 1 ||
      parsedLimit < 1
    ) {
      throw new BadRequestException(
        'page và limit phải là số nguyên dương',
      );
    }

    return this.ordersService.findAll(parsedPage, parsedLimit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return order;
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
