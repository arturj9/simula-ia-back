import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockService = {
    generateQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  it('deve chamar o service.generateQuestion', async () => {
    const dto = {
      topic: 'A',
      difficulty: 'EASY' as const,
      type: 'OBJECTIVE' as const,
    };
    await controller.generate(dto);
    expect(service.generateQuestion).toHaveBeenCalledWith(dto);
  });
});
