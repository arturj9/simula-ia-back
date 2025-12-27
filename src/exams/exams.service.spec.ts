import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';

describe('ExamsService', () => {
  let service: ExamsService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let aiServiceMock: DeepMockProxy<AiService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    aiServiceMock = mockDeep<AiService>();

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(prismaMock);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AiService, useValue: aiServiceMock },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  describe('findOne', () => {
    it('deve retornar um exame detalhado se encontrado', async () => {
      const examMock = {
        id: 'exam-1',
        title: 'Prova Final',
        examQuestions: [
          { question: { statement: 'Q1' }, order: 1 },
          { question: { statement: 'Q2' }, order: 2 },
        ],
      };

      prismaMock.exam.findUnique.mockResolvedValue(examMock as any);

      const result = await service.findOne('exam-1');

      expect(result).toEqual(examMock);
    });

    it('deve lançar NotFoundException se o exame não existir', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(null);
      await expect(service.findOne('exam-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const examId = 'exam-1';
    const userId = 'user-1';

    it('deve deletar o exame se o usuário for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: userId,
      } as any);

      await service.remove(examId, userId);

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: examId },
      });
    });

    it('deve lançar ForbiddenException se o usuário não for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: 'outro-user',
      } as any);

      await expect(service.remove(examId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('previewAiGeneration', () => {
    const config: NonNullable<CreateExamDto['generateConfig']> = {
      disciplineId: 'disc-1',
      useAI: true,
      count: 10,
      onlyMyQuestions: false,
      items: [
        {
          topic: 'Historia',
          difficulty: 'EASY',
          type: 'OBJECTIVE',
          count: 2,
        },
      ],
    };

    it('deve gerar preview de questões chamando o AiService', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({
        name: 'História',
      } as any);
      aiServiceMock.generateQuestion.mockResolvedValue({
        statement: 'Questão Gerada',
        correctAnswer: 'A',
        alternatives: [],
        explanation: 'Porque sim',
      } as any);

      const result = await service.previewAiGeneration(config);

      expect(result).toHaveLength(2);
      expect(prismaMock.question.create).not.toHaveBeenCalled();
    });

    it('deve capturar erro e lançar InternalServerErrorException se a IA falhar', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({
        name: 'História',
      } as any);
      aiServiceMock.generateQuestion.mockRejectedValue(new Error('API Down'));

      await expect(service.previewAiGeneration(config)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve falhar se a configuração estiver inválida (sem items)', async () => {
      await expect(
        service.previewAiGeneration({
          useAI: true,
          items: [],
          count: 10,
          onlyMyQuestions: false,
          disciplineId: 'd-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se a disciplina não existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue(null);

      await expect(service.previewAiGeneration(config)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const userId = 'user-1';

    it('deve criar prova HÍBRIDA (Manual + Nova + IA) com sucesso', async () => {
      const dto: CreateExamDto = {
        title: 'Prova IA',
        visibility: 'PRIVATE',
        questionIds: ['q-manual-1'],
        newQuestions: [
          {
            statement: 'Nova Q',
            correctAnswer: 'B',
            difficulty: 'MEDIUM',
            type: 'OBJECTIVE',
          },
        ],
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: true,
          count: 5,
          onlyMyQuestions: false,
          items: [
            {
              topic: 'Geo',
              count: 1,
              difficulty: 'EASY',
              type: 'TRUE_FALSE',
            },
          ],
        },
      };

      prismaMock.exam.create.mockResolvedValue({
        id: 'exam-1',
        disciplineId: 'disc-1',
      } as any);
      prismaMock.question.count.mockResolvedValue(1);
      prismaMock.question.create
        .mockResolvedValueOnce({ id: 'q-new-1' } as any)
        .mockResolvedValueOnce({ id: 'q-ai-1' } as any);
      prismaMock.discipline.findUnique.mockResolvedValue({
        name: 'Geografia',
      } as any);
      aiServiceMock.generateQuestion.mockResolvedValue({
        statement: 'IA Q',
        correctAnswer: 'V',
      } as any);
      prismaMock.exam.findUnique.mockResolvedValue({ id: 'exam-1' } as any);

      await service.create(userId, dto);

      expect(prismaMock.examQuestion.create).toHaveBeenCalledTimes(3);
    });

    it('deve falhar se a disciplina não existir (Geração IA)', async () => {
      const dto: CreateExamDto = {
        title: 'Prova IA Fail',
        visibility: 'PUBLIC',
        generateConfig: {
          disciplineId: 'disc-invalida',
          useAI: true,
          count: 3,
          onlyMyQuestions: false,
          items: [
            {
              topic: 'Bio',
              count: 1,
              difficulty: 'EASY',
              type: 'OBJECTIVE',
            },
          ],
        },
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-rollback' } as any);

      prismaMock.discipline.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-rollback' },
      });
    });

    it('deve criar prova com questões ALEATÓRIAS do banco (useAI: false)', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Randômica',
        visibility: 'PUBLIC',
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: false,
          count: 2,
          difficulty: 'EASY',
          onlyMyQuestions: false,
        },
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-rand' } as any);
      prismaMock.question.findMany.mockResolvedValue([
        { id: 'q-db-1' },
        { id: 'q-db-2' },
        { id: 'q-db-3' },
      ] as any);
      prismaMock.exam.findUnique.mockResolvedValue({ id: 'exam-rand' } as any);

      await service.create(userId, dto);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            disciplineId: 'disc-1',
            difficulty: 'EASY',
          }),
        }),
      );
      expect(prismaMock.examQuestion.create).toHaveBeenCalledTimes(2);
    });

    it('deve falhar se não houver questões suficientes no banco (Aleatório)', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Fail',
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: false,
          count: 10,
          onlyMyQuestions: false,
        },
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-temp' } as any);
      prismaMock.question.findMany.mockResolvedValue([{ id: 'q-1' }] as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-temp' },
      });
    });

    it('deve lançar BadRequestException se itens não forem passados', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Sem Itens',
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: true,
          count: 3,
          onlyMyQuestions: false,
          items: undefined,
        },
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({
        id: 'exam-rollback-2',
      } as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-rollback-2' },
      });
    });

    it('deve lançar BadRequestException se o count não for passado', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Sem Count',
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: false,
          onlyMyQuestions: false,
          count: 0,
        },
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({
        id: 'exam-rollback-3',
      } as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-rollback-3' },
      });
    });

    it('deve relançar NotFoundException sem envolver em InternalServerError', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Erro',
        questionIds: ['id-invalido'],
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-temp' } as any);
      prismaMock.question.count.mockResolvedValue(0);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerErrorException em falhas genéricas', async () => {
      prismaMock.exam.create.mockResolvedValue({ id: 'exam-fail' } as any);
      prismaMock.question.count.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.create(userId, {
          title: 'Fail',
          questionIds: ['q-1'],
          visibility: 'PUBLIC',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('deve lançar BadRequestException se o exame for criado sem NENHUMA questão', async () => {
      const dto: CreateExamDto = {
        title: 'Prova Vazia',
        visibility: 'PRIVATE',
        questionIds: [],
        newQuestions: [],
        generateConfig: undefined,
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-temp' } as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-temp' },
      });
    });

    it('deve lançar NotFoundException e fazer rollback se IDs manuais não existirem', async () => {
      const dto: CreateExamDto = {
        title: 'Erro Manual',
        questionIds: ['id-inexistente'],
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-temp' } as any);
      prismaMock.question.count.mockResolvedValue(0);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-temp' },
      });
    });

    it('deve lançar BadRequestException e fazer rollback se faltarem questões no banco (Aleatório)', async () => {
      const dto: CreateExamDto = {
        title: 'Erro Aleatório',
        generateConfig: {
          disciplineId: 'disc-1',
          useAI: false,
          count: 50,
          onlyMyQuestions: false,
        },
        visibility: 'PUBLIC',
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'exam-temp' } as any);
      prismaMock.question.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'exam-temp' },
      });
    });
  });

  describe('update', () => {
    const userId = 'user-1';
    const examId = 'exam-1';

    it('deve atualizar metadados e reordenar questões via transação', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: userId,
      } as any);
      prismaMock.question.count.mockResolvedValue(2);

      const dto = {
        title: 'Novo Título',
        questions: ['q-2', 'q-1'],
      };

      await service.update(examId, userId, dto);

      expect(prismaMock.examQuestion.deleteMany).toHaveBeenCalled();
      expect(prismaMock.examQuestion.create).toHaveBeenCalledTimes(2);
    });

    it('deve lançar BadRequest se tentar atualizar com lista de questões vazia', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: userId,
      } as any);

      await expect(
        service.update(examId, userId, { questions: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve impedir edição se não for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: 'outro-user',
      } as any);

      await expect(
        service.update(examId, userId, { title: 'Hacker' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve falhar se alguma questão da lista não existir', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: examId,
        creatorId: userId,
      } as any);
      prismaMock.question.count.mockResolvedValue(1);

      await expect(
        service.update(examId, userId, { questions: ['q-1', 'q-fantasma'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve falhar se o exame não existir', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(null);

      await expect(
        service.update(examId, userId, { title: 'Fail' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll e findMyExams', () => {
    it('findAll deve aplicar paginação e filtro PUBLIC', async () => {
      prismaMock.exam.count.mockResolvedValue(0);
      prismaMock.exam.findMany.mockResolvedValue([]);

      await service.findAll({ page: 2, perPage: 20 });

      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
          where: expect.objectContaining({ visibility: 'PUBLIC' }),
        }),
      );
    });

    it('findMyExams deve filtrar pelo creatorId', async () => {
      prismaMock.exam.count.mockResolvedValue(0);
      prismaMock.exam.findMany.mockResolvedValue([]);

      await service.findMyExams('user-1', { page: 1, perPage: 10 });

      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ creatorId: 'user-1' }),
        }),
      );
    });
  });
});
