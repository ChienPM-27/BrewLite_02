
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MockPaymentOutcome = 'SUCCESS' | 'FAILED';

@Injectable()
export class MockGatewayService {
  constructor(private readonly configService: ConfigService) {}

  processPayment(outcomeHeader?: string): MockPaymentOutcome {
    const nodeEnvironment =
      this.configService.get<string>('NODE_ENV') ?? 'development';

    if (nodeEnvironment === 'production') {
      throw new ServiceUnavailableException(
        'Mock payment không được bật trong production',
      );
    }

    if (
      outcomeHeader === undefined ||
      outcomeHeader.trim() === ''
    ) {
      return 'SUCCESS';
    }

    const normalizedOutcome = outcomeHeader.trim().toUpperCase();

    if (
      normalizedOutcome !== 'SUCCESS' &&
      normalizedOutcome !== 'FAILED'
    ) {
      throw new BadRequestException(
        'X-Mock-Outcome chỉ chấp nhận SUCCESS hoặc FAILED',
      );
    }

    return normalizedOutcome;
  }
}
