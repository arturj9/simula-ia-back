import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

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
    it('deve chamar service.create com os parâmetros corretos', async () => {
      const dto = { title: 'Prova Teste' } as any;
      const req = { user: { sub: 'user-1' } } as any;

      await controller.create(req, dto);

      expect(service.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll (Público)', () => {
    it('deve chamar service.findAll com query params', async () => {
      const query = { page: 1, perPage: 10 } as any;
      await controller.findAll(query);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findMyExams (Privado)', () => {
    it('deve chamar service.findMyExams com ID do usuário', async () => {
      const req = { user: { sub: 'user-1' } } as any;
      const query = { page: 1, perPage: 10 } as any;

      await controller.findMyExams(req, query);

      expect(service.findMyExams).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('findOne', () => {
    it('deve chamar service.findOne com ID', async () => {
      await controller.findOne('ex-1');
      expect(service.findOne).toHaveBeenCalledWith('ex-1');
    });
  });

  describe('update', () => {
    it('deve chamar service.update', async () => {
      const req = { user: { sub: 'user-1' } } as any;
      const dto = { title: 'Novo Título' } as any;

      await controller.update(req, 'ex-1', dto);

      expect(service.update).toHaveBeenCalledWith('ex-1', 'user-1', dto);
    });
  });

  describe('remove', () => {
    it('deve chamar service.remove', async () => {
      const req = { user: { sub: 'user-1' } } as any;

      await controller.remove(req, 'ex-1');

      expect(service.remove).toHaveBeenCalledWith('ex-1', 'user-1');
    });
  });
});
