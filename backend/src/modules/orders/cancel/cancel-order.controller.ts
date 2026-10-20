import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CancelOrderService } from './cancel-order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class CancelOrderController {
  constructor(private readonly cancelOrderService: CancelOrderService) {}

  /** POST /api/v1/orders/:id/cancel — userId chỉ lấy từ token (D4), không nhận từ body. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.cancelOrderService.cancel(id, req.user.sub);
  }
}
