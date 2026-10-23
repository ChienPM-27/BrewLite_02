import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { GetOrderHistoryDto } from './dto/get-order-history.dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetOrderHistoryDto,
  ) {
    return this.historyService.findAll(req.user.sub, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.historyService.findOne(req.user.sub, id);
  }
}
