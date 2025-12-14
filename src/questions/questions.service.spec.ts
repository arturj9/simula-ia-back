import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  describe('create', () => {
    it('deve criar uma questão com sucesso', async () => {
      const dto = {
        statement: 'Teste',
        correctAnswer: 'A',
        difficulty: 'EASY' as const,
        type: 'OBJECTIVE' as const,
      };
      const userId = 'user-uuid';

      prismaMock.question.create.mockResolvedValue({
        id: 'q-1',
        ...dto,
        creatorId: userId,
      } as any);

      const result = await service.create(userId, dto);

      expect(result).toHaveProperty('id', 'q-1');
      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: userId }),
        }),
      );
    });

    it('deve lançar erro se o banco falhar', async () => {
      prismaMock.question.create.mockRejectedValue(new Error('Erro DB'));
      await expect(service.create('u-1', {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar dados paginados e aplicar filtros', async () => {
      const params = {
        page: 2,
        perPage: 10,
        search: 'math',
        orderBy: 'createdAt' as const,
        order: 'desc' as const,
      };

      prismaMock.question.count.mockResolvedValue(50);
      prismaMock.question.findMany.mockResolvedValue([{ id: 'q-1' }] as any);

      const result = await service.findAll(params);

      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        perPage: 10,
        lastPage: 5,
      });

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          where: expect.objectContaining({
            statement: { contains: 'math', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('deve filtrar por disciplina se disciplineId for fornecido', async () => {
      const params = {
        page: 1,
        perPage: 10,
        disciplineId: 'uuid-matematica',
        orderBy: 'createdAt' as const,
        order: 'desc' as const,
      };

      prismaMock.question.count.mockResolvedValue(0);
      prismaMock.question.findMany.mockResolvedValue([]);

      await service.findAll(params);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            disciplineId: 'uuid-matematica',
          }),
        }),
      );
    });

    it('deve lançar InternalServerErrorException se o banco falhar', async () => {
      prismaMock.question.count.mockRejectedValue(new Error('Erro DB'));
      await expect(
        service.findAll({
          page: 1,
          perPage: 10,
          orderBy: 'createdAt',
          order: 'desc',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findMyQuestions', () => {
    it('deve retornar apenas as questões do usuário logado', async () => {
      const userId = 'user-1';
      const params = {
        page: 1,
        perPage: 10,
        orderBy: 'createdAt' as const,
        order: 'desc' as const,
      };

      prismaMock.question.count.mockResolvedValue(1);
      prismaMock.question.findMany.mockResolvedValue([
        { id: 'q-1', creatorId: userId },
      ] as any);

      await service.findMyQuestions(userId, params);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: userId,
          }),
        }),
      );
    });

    it('deve lançar InternalServerErrorException se o banco falhar', async () => {
      prismaMock.question.count.mockRejectedValue(new Error('Erro DB'));
      await expect(
        service.findMyQuestions('user-1', {
          page: 1,
          perPage: 10,
          orderBy: 'createdAt',
          order: 'desc',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('deve retornar a questão se existir', async () => {
      prismaMock.question.findUnique.mockResolvedValue({ id: 'q-1' } as any);
      const result = await service.findOne('q-1');
      expect(result.id).toBe('q-1');
    });

    it('deve lançar NotFoundException se não existir', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);
      await expect(service.findOne('q-99')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar InternalServerErrorException para outros erros', async () => {
      prismaMock.question.findUnique.mockRejectedValue(
        new Error('Erro aleatório'),
      );
      await expect(service.findOne('q-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar se for o dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      prismaMock.question.update.mockResolvedValue({
        id: 'q-1',
        statement: 'Novo',
      } as any);

      const result = await service.update('q-1', 'user-1', {
        statement: 'Novo',
      });

      expect(result.statement).toBe('Novo');
    });

    it('deve bloquear (Forbidden) se não for o dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      await expect(service.update('q-1', 'user-2', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar InternalServerErrorException se o banco falhar', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      prismaMock.question.update.mockRejectedValue(
        new Error('Erro Fatal do Banco'),
      );

      await expect(service.update('q-1', 'user-1', {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('deve deletar se for o dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);
      prismaMock.question.delete.mockResolvedValue({} as any);

      await service.remove('q-1', 'user-1');

      expect(prismaMock.question.delete).toHaveBeenCalledWith({
        where: { id: 'q-1' },
      });
    });

    it('deve bloquear (Forbidden) se não for o dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      await expect(service.remove('q-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar erro genérico se o banco falhar no delete', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);
      prismaMock.question.delete.mockRejectedValue(
        new InternalServerErrorException('Erro DB'),
      );

      await expect(service.remove('q-1', 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
