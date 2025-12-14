import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    jwtService = mockDeep<JwtService>();
    configService = mockDeep<ConfigService>();

    guard = new AuthGuard(jwtService, configService);
  });

  it('deve lançar Unauthorized se não houver token', async () => {
    const context = createMockContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar Unauthorized se o token for inválido', async () => {
    const context = createMockContext('Bearer token_invalido');

    jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve permitir acesso e anexar user ao request se token for válido', async () => {
    const context = createMockContext('Bearer token_valido');
    const payload = { sub: '123', email: 'teste@teste.com' };

    jest.spyOn(configService, 'get').mockReturnValue('secret');
    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req['user']).toEqual(payload);
  });
});

function createMockContext(authHeader: string | null): any {
  const request = {
    headers: {
      authorization: authHeader,
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}
