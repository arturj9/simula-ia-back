import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
      };
    }),
  };
});

const prismaMock = {
  question: {
    findMany: jest.fn(),
  },
};

const configMock = {
  get: jest.fn(),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGenerateContent.mockReset();
    prismaMock.question.findMany.mockReset();
    configMock.get.mockReset();

    configMock.get.mockImplementation((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'fake_api_key';
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar uma questão OBJETIVA com sucesso', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            statement: 'Teste Objective',
            alternatives: [{ text: 'A' }, { text: 'B' }],
            correctAnswer: 'A',
            explanation: 'Ok',
          }),
      },
    });

    const dto = {
      topic: 'Test',
      difficulty: 'EASY' as const,
      type: 'OBJECTIVE' as const,
    };

    const result = await service.generateQuestion(dto);

    expect(result.statement).toBe('Teste Objective');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining(
        'O JSON DEVE ter um campo "alternatives" com um array de 5 objetos',
      ),
    );
  });

  it('deve gerar uma questão VERDADEIRO/FALSO com Contexto Geral', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            statement: 'V ou F?',
            alternatives: [{ text: 'Verdadeiro' }, { text: 'Falso' }],
            correctAnswer: 'Verdadeiro',
            explanation: 'Logica',
          }),
      },
    });

    const dto = {
      topic: 'Lógica',
      difficulty: 'MEDIUM' as const,
      type: 'TRUE_FALSE' as const,
      generalContext: 'Foque em lógica booleana',
    };

    const result = await service.generateQuestion(dto);

    expect(result.correctAnswer).toBe('Verdadeiro');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining(
        'DIRETRIZES GERAIS DO PROFESSOR: "Foque em lógica booleana"',
      ),
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining(
        'O JSON DEVE ter um campo "alternatives" com exatamente 2 objetos',
      ),
    );
  });

  it('deve gerar uma questão DISCURSIVA corretamente', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            statement: 'Discorra sobre a vida.',
            alternatives: [],
            correctAnswer: 'Resposta esperada...',
            explanation: 'Critérios de avaliação',
          }),
      },
    });

    const dto = {
      topic: 'Filosofia',
      difficulty: 'HARD' as const,
      type: 'DISCURSIVE' as const,
    };

    const result = await service.generateQuestion(dto);

    expect(result.alternatives).toHaveLength(0);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining(
        'O campo "alternatives" DEVE ser um array vazio []',
      ),
    );
  });

  it('deve usar questões base do banco para contexto (Few-Shot Prompting)', async () => {
    prismaMock.question.findMany.mockResolvedValue([
      { statement: 'Base 1', correctAnswer: 'X' },
    ]);

    mockGenerateContent.mockResolvedValue({
      response: { text: () => '{}' },
    });

    await service.generateQuestion({
      topic: 'Test',
      difficulty: 'EASY' as const,
      type: 'OBJECTIVE' as const,
      baseQuestionIds: ['uuid-1'],
    });

    expect(prismaMock.question.findMany).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('--- QUESTÕES DE REFERÊNCIA (INSPIRAÇÃO) ---'),
    );
  });

  it('deve lançar NotFoundException imediatamente se questões base não existirem', async () => {
    prismaMock.question.findMany.mockResolvedValue([]);

    await expect(
      service.generateQuestion({
        topic: 'Test',
        difficulty: 'EASY' as const,
        type: 'OBJECTIVE' as const,
        baseQuestionIds: ['uuid-fake'],
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('deve tentar novamente (Retry) se a IA der erro 429 (Rate Limit)', async () => {
    mockGenerateContent
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({
        response: { text: () => '{}' },
      });

    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });

    await service.generateQuestion({
      topic: 'T',
      difficulty: 'EASY',
      type: 'OBJECTIVE',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('deve falhar e lançar InternalServerError após exceder tentativas máximas', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Erro Fatal na API'));

    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });

    await expect(
      service.generateQuestion({
        topic: 'T',
        difficulty: 'EASY',
        type: 'OBJECTIVE',
      }),
    ).rejects.toThrow(InternalServerErrorException);

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('deve lançar InternalServerError se a apiKey não estiver configurada', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'GEMINI_API_KEY') return null;
      return null;
    });

    await expect(
      Test.createTestingModule({
        providers: [
          AiService,
          { provide: PrismaService, useValue: prismaMock },
          { provide: ConfigService, useValue: configMock },
        ],
      }).compile(),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('deve falhar e lançar "Erro inesperado na IA" após esgotar todas as tentativas', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Erro Genérico da API'));

    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });

    await expect(
      service.generateQuestion({
        topic: 'Test',
        difficulty: 'EASY',
        type: 'OBJECTIVE',
      }),
    ).rejects.toThrow(
      new InternalServerErrorException('Erro inesperado na IA.'),
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });
});
