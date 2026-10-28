import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('AuthService & Auth Validation', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let jwtStrategy: JwtStrategy;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
    get: jest.fn().mockReturnValue('7d'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  describe('ValidationPipe whitelist on RegisterDto', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    it('nên từ chối và ném BadRequestException nếu client gửi trường "role" khi đăng ký', async () => {
      const invalidBody = {
        email: 'attacker@example.com',
        password: 'password123',
        role: 'ADMIN',
      };

      await expect(
        pipe.transform(invalidBody, { type: 'body', metatype: RegisterDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên chấp nhận nếu body đăng ký hợp lệ và không chứa trường ngoài luồng', async () => {
      const validBody = {
        email: 'user@example.com',
        password: 'password123',
        fullName: 'Nguyen Van A',
      };

      const result = await pipe.transform(validBody, {
        type: 'body',
        metatype: RegisterDto,
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('register', () => {
    it('nên tạo user với role CUSTOMER, ký JWT payload có { sub, email, role } và trả về user.role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'test@brewlite.test',
        fullName: 'Test User',
        role: Role.CUSTOMER,
        loyaltyPoints: 0,
      });
      mockJwt.signAsync.mockResolvedValue('mock-token');

      const result = await authService.register({
        email: 'test@brewlite.test',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@brewlite.test',
          loyaltyPoints: 0,
        }),
      });

      expect(mockJwt.signAsync).toHaveBeenCalledWith({
        sub: 'u-1',
        email: 'test@brewlite.test',
        role: Role.CUSTOMER,
      });

      expect(result).toEqual({
        accessToken: 'mock-token',
        user: {
          id: 'u-1',
          email: 'test@brewlite.test',
          fullName: 'Test User',
          role: Role.CUSTOMER,
          loyaltyPoints: 0,
        },
      });
    });

    it('ném ConflictException nếu email đã tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({
          email: 'existing@brewlite.test',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('nên ký JWT payload chứa đúng role của user (ADMIN) và trả về user.role khớp', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@brewlite.test',
        passwordHash,
        fullName: 'Admin User',
        role: Role.ADMIN,
        loyaltyPoints: 50,
      });
      mockJwt.signAsync.mockResolvedValue('admin-token');

      const result = await authService.login({
        email: 'admin@brewlite.test',
        password: 'secret123',
      });

      expect(mockJwt.signAsync).toHaveBeenCalledWith({
        sub: 'admin-1',
        email: 'admin@brewlite.test',
        role: Role.ADMIN,
      });

      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.accessToken).toBe('admin-token');
    });

    it('ném UnauthorizedException nếu mật khẩu sai', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'user@brewlite.test',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'user@brewlite.test',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JwtStrategy', () => {
    it('validate trả về { sub, email, role } đúng với payload', async () => {
      const validated = await jwtStrategy.validate({
        sub: 'admin-1',
        email: 'admin@brewlite.test',
        role: Role.ADMIN,
      });

      expect(validated).toEqual({
        sub: 'admin-1',
        email: 'admin@brewlite.test',
        role: Role.ADMIN,
      });
    });

    it('nếu token cũ không có role thì tự động fallback về Role.CUSTOMER', async () => {
      const validated = await jwtStrategy.validate({
        sub: 'legacy-1',
        email: 'legacy@brewlite.test',
      });

      expect(validated).toEqual({
        sub: 'legacy-1',
        email: 'legacy@brewlite.test',
        role: Role.CUSTOMER,
      });
    });
  });
});
