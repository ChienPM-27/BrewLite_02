import { Module, Controller } from '@nestjs/common';

@Controller('auth')
export class AuthController {}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
