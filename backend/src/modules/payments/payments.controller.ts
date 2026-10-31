
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // ==========================================
  // TẠO THANH TOÁN
  // ==========================================

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Headers('idempotency-key')
    idempotencyKey: string,

    @Body()
    body: CreatePaymentDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    const gateway = body.gateway ?? 'MOCK';

    const mockOutcome =
      gateway === 'MOCK' &&
      this.configService.get<string>('NODE_ENV') !== 'production'
        ? request.headers['x-mock-outcome']
        : undefined;

    const normalizedMockOutcome =
      Array.isArray(mockOutcome)
        ? mockOutcome[0]
        : mockOutcome;

    return this.paymentsService.createPayment(
      request.user.sub,
      idempotencyKey,
      body,
      normalizedMockOutcome,
      request.ip ?? '127.0.0.1',
    );
  }

  // ==========================================
  // VNPAY IPN
  // ==========================================

  @Get('vnpay/ipn')
  async vnpayIpn(
    @Query()
    query: Record<string, string | string[] | undefined>,
  ) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Get(':id')
@UseGuards(JwtAuthGuard)
async getPaymentById(
  @Param('id') paymentId: string,
  @Req() request: AuthenticatedRequest,
) {
  return this.paymentsService.getPaymentById(
    paymentId,
    request.user.sub,
  );
}
}
