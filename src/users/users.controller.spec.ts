import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { CanActivate } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    // Mock do Guard para permitir acesso nos testes
    const mockAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('getProfile deve chamar usersService.findOne', async () => {
    const req = { user: { sub: 'uuid-123' } } as any;
    mockUsersService.findOne.mockResolvedValue({ name: 'Teste' });

    await controller.getProfile(req);

    expect(usersService.findOne).toHaveBeenCalledWith('uuid-123');
  });

  it('updateProfile deve chamar usersService.update', async () => {
    const req = { user: { sub: 'uuid-123' } } as any;
    const dto = { name: 'Novo Nome' };
    mockUsersService.update.mockResolvedValue(true);

    await controller.updateProfile(req, dto);

    expect(usersService.update).toHaveBeenCalledWith('uuid-123', dto);
  });

  it('deleteProfile deve chamar usersService.delete', async () => {
    const req = { user: { sub: 'uuid-123' } } as any;
    mockUsersService.delete.mockResolvedValue(true);

    await controller.deleteProfile(req);

    expect(usersService.delete).toHaveBeenCalledWith('uuid-123');
  });
});
