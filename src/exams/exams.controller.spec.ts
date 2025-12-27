import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BadRequestException } from '@nestjs/common';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: ExamsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findMyExams: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    previewAiGeneration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [{ provide: ExamsService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ExamsController>(ExamsController);
    service = module.get<ExamsService>(ExamsService);
  });

  describe('create', () => {
    it('deve chamar create', async () => {
      const dto = { title: 'Prova' } as any;
      await controller.create({ user: { sub: 'u1' } } as any, dto);
      expect(service.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('previewGeneration', () => {
    it('deve chamar previewAiGeneration', async () => {
      const config = { useAI: true, items: [] } as any;
      await controller.previewGeneration(config);
      expect(service.previewAiGeneration).toHaveBeenCalledWith(config);
    });

    it('deve falhar se config for nula', async () => {
      await expect(controller.previewGeneration(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('findMyExams deve chamar service.findMyExams', async () => {
    const req = { user: { sub: 'user-1' } } as any;
    const query = { page: 1, perPage: 10 } as any;

    await controller.findMyExams(req, query);

    expect(service.findMyExams).toHaveBeenCalledWith('user-1', query);
  });

  it('findAll', async () => {
    await controller.findAll({ page: 1 } as any);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne', async () => {
    await controller.findOne('id');
    expect(service.findOne).toHaveBeenCalledWith('id');
  });

  it('update', async () => {
    await controller.update({ user: { sub: 'u1' } } as any, 'id', {} as any);
    expect(service.update).toHaveBeenCalled();
  });

  it('remove', async () => {
    await controller.remove({ user: { sub: 'u1' } } as any, 'id');
    expect(service.remove).toHaveBeenCalled();
  });
});
