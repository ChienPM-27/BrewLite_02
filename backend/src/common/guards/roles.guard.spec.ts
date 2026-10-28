import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('nên cho qua nếu route không có @Roles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ id: 'u1', role: Role.CUSTOMER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho qua nếu user có role khớp với @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ id: 'u1', role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên ném ForbiddenException (403) nếu CUSTOMER gọi route @Roles(ADMIN)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ id: 'u1', role: Role.CUSTOMER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Forbidden resource');
  });

  it('nên ném ForbiddenException (403) nếu request thiếu user hoặc thiếu role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const contextNoUser = createMockContext(undefined);
    const contextNoRole = createMockContext({ id: 'u1' });

    expect(() => guard.canActivate(contextNoUser)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextNoRole)).toThrow(ForbiddenException);
  });

  it('nên cho qua khi @Roles có nhiều role và user thuộc 1 trong các role đó', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.BARISTA]);
    const contextAdmin = createMockContext({ id: 'u1', role: Role.ADMIN });
    const contextBarista = createMockContext({ id: 'u2', role: Role.BARISTA });
    const contextCustomer = createMockContext({ id: 'u3', role: Role.CUSTOMER });

    expect(guard.canActivate(contextAdmin)).toBe(true);
    expect(guard.canActivate(contextBarista)).toBe(true);
    expect(() => guard.canActivate(contextCustomer)).toThrow(ForbiddenException);
  });
});
