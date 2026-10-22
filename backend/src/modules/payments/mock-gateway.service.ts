import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MockPaymentOutcome = 'SUCCESS' | 'FAILED';

@Injectable()
export class MockGatewayService {
  constructor(private readonly configService: ConfigService) {}

  processPayment(outcomeHeader?: string): MockPaymentOutcome {
    const nodeEnvironment =
      this.configService.get<string>('NODE_ENV') ?? 'development';

    // Trong môi trường production, luôn bỏ qua header mô phỏng và xử lý thành công (D8, TC-PAY-19)
    if (nodeEnvironment === 'production') {
      return 'SUCCESS';
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
