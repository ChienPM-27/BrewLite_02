import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: Role | string;
}

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    const role: Role =
      payload.role && Object.values(Role).includes(payload.role as Role)
        ? (payload.role as Role)
        : Role.CUSTOMER;
    return { sub: payload.sub, email: payload.email, role };
  }
}
