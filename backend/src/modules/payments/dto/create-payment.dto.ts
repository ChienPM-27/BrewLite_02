
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

import {
  PaymentMethod,
  PaymentGateway,
} from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway = PaymentGateway.MOCK;
}
