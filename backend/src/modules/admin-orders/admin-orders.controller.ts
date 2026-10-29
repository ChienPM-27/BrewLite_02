// Khung do Leader tạo. Logic do Quang Huy hiện thực theo docs/admin-orders/api-contract.md
import { Controller, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}
}
