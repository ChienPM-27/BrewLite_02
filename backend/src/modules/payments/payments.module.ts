import { Module, Controller } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {}

@Module({
  controllers: [PaymentsController],
})
export class PaymentsModule {}
