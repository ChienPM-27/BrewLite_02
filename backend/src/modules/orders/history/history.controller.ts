import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';

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
  findAll(@Req() req: AuthenticatedRequest) {
    return this.historyService.findAll(req.user.sub);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.historyService.findOne(req.user.sub, id);
  }
}