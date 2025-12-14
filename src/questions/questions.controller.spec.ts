import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let service: QuestionsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findMyQuestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [{ provide: QuestionsService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<QuestionsController>(QuestionsController);
    service = module.get<QuestionsService>(QuestionsService);
  });

  it('create deve chamar service.create', async () => {
    const req = { user: { sub: 'user-1' } } as any;
    const dto = { statement: 'Q1', correctAnswer: 'A' } as any;

    await controller.create(req, dto);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('findOne deve chamar service.findOne', async () => {
    await controller.findOne('q-1');
    expect(service.findOne).toHaveBeenCalledWith('q-1');
  });

  it('findAll deve chamar service.findAll', async () => {
    const query = { page: 1, perPage: 10 } as any;
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('findMyQuestions deve chamar service.findMyQuestions', async () => {
    const req = { user: { sub: 'user-1' } } as any;
    const query = { page: 1, perPage: 10 } as any;

    await controller.findMyQuestions(req, query);

    expect(service.findMyQuestions).toHaveBeenCalledWith('user-1', query);
  });

  it('update deve chamar service.update', async () => {
    const req = { user: { sub: 'user-1' } } as any;
    const dto = { statement: 'Update' };

    await controller.update(req, 'q-1', dto);
    expect(service.update).toHaveBeenCalledWith('q-1', 'user-1', dto);
  });

  it('remove deve chamar service.remove', async () => {
    const req = { user: { sub: 'user-1' } } as any;
    await controller.remove(req, 'q-1');
    expect(service.remove).toHaveBeenCalledWith('q-1', 'user-1');
  });
});
