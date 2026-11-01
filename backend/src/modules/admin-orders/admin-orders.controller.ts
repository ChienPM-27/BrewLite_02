import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { AdvanceOrderDto } from './dto/advance-order.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /** GET /api/v1/admin/orders — đơn cần xử lý (PAID/PREPARING/READY), cũ nhất trước. */
  @Get()
  findActive() {
    return this.adminOrdersService.findActive();
  }

  /** PATCH /api/v1/admin/orders/:id/advance — server tự tính trạng thái kế tiếp. */
  @Patch(':id/advance')
  advance(@Param('id') id: string, @Body() dto: AdvanceOrderDto) {
    return this.adminOrdersService.advance(id, dto.expectedStatus);
  }
}
