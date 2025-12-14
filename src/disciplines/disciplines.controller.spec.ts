import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('DisciplinesController', () => {
  let controller: DisciplinesController;
  let service: DisciplinesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisciplinesController],
      providers: [{ provide: DisciplinesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DisciplinesController>(DisciplinesController);
    service = module.get<DisciplinesService>(DisciplinesService);
  });

  it('create deve chamar service.create', async () => {
    const dto = { name: 'Matemática' };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll deve chamar service.findAll', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne deve chamar service.findOne', async () => {
    await controller.findOne('uuid-1');
    expect(service.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('update deve chamar service.update', async () => {
    const dto = { name: 'História' };
    await controller.update('uuid-1', dto);
    expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
  });

  it('remove deve chamar service.remove', async () => {
    await controller.remove('uuid-1');
    expect(service.remove).toHaveBeenCalledWith('uuid-1');
  });
});
