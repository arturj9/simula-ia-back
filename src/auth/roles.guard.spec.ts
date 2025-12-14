import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('deve permitir acesso se a rota não tiver roles definidas', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const context = {
      getHandler: () => {},
      getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve permitir acesso se o usuário tiver a role correta', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PROFESSOR']);

    const context = createMockContext({ role: 'PROFESSOR' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve bloquear (Forbidden) se o usuário tiver a role errada', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PROFESSOR']);

    const context = createMockContext({ role: 'STUDENT' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

function createMockContext(user: any): ExecutionContext {
  return {
    getHandler: () => {},
    getClass: () => {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}
