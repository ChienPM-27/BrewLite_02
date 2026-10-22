import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
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
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async createPayment(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreatePaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const mockOutcome =
      this.configService.get<string>('NODE_ENV') === 'production'
        ? undefined
        : request.headers['x-mock-outcome'];

    const normalizedMockOutcome = Array.isArray(mockOutcome)
      ? mockOutcome[0]
      : mockOutcome;

    return this.paymentsService.createPayment(
      request.user.sub,
      idempotencyKey,
      body,
      normalizedMockOutcome,
    );
  }
}
