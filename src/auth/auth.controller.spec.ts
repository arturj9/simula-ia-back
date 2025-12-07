import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    me: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('signUp deve chamar authService.signUp', async () => {
    const dto = {
      name: 'Artur',
      email: 'a@a.com',
      password: '123',
      role: 'STUDENT' as const,
    };

    mockAuthService.signUp.mockResolvedValue({ id: '1', ...dto });

    await controller.signUp(dto);

    expect(authService.signUp).toHaveBeenCalledWith(dto);
  });

  it('signIn deve chamar authService.signIn', async () => {
    const dto = { email: 'a@a.com', password: '123' };
    mockAuthService.signIn.mockResolvedValue({ accessToken: 'token' });

    await controller.signIn(dto);

    expect(authService.signIn).toHaveBeenCalledWith(dto);
  });
});
