import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
        statement: 'Texto',
        correctAnswer: 'A',
        difficulty: 'EASY' as const,
        type: 'OBJECTIVE' as const,
        disciplineId: 'd-1',
      };

      prismaMock.discipline.findUnique.mockResolvedValue({ id: 'd-1' } as any);
      prismaMock.question.create.mockResolvedValue({
        id: 'q-1',
        ...dto,
      } as any);

      await service.create('user-1', dto);

      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statement: 'Texto',
            creatorId: 'user-1',
          }),
        }),
      );
    });

    it('deve falhar se disciplina não existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue(null);
      await expect(
        service.create('user-1', { disciplineId: 'fake' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada e filtrada', async () => {
      prismaMock.question.count.mockResolvedValue(1);
      prismaMock.question.findMany.mockResolvedValue([{ id: 'q-1' } as any]);

      const params = {
        page: 1,
        perPage: 10,
        search: 'termo',
        disciplineId: 'd-1',
      } as any;

      const res = await service.findAll(params);

      expect(res.data).toHaveLength(1);
      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            disciplineId: 'd-1',
            OR: expect.arrayContaining([
              expect.objectContaining({
                statement: { contains: 'termo', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('deve retornar lista sem filtros', async () => {
      prismaMock.question.count.mockResolvedValue(0);
      prismaMock.question.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, perPage: 10 } as any);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ OR: expect.anything() }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar uma questão', async () => {
      prismaMock.question.findUnique.mockResolvedValue({ id: 'q-1' } as any);
      await service.findOne('q-1');
      expect(prismaMock.question.findUnique).toHaveBeenCalled();
    });

    it('deve lançar NotFound se não existir', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);
      await expect(service.findOne('q-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar se for dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      await service.update('q-1', 'user-1', { statement: 'Novo' });
      expect(prismaMock.question.update).toHaveBeenCalled();
    });

    it('deve lançar Forbidden se não for dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);

      await expect(service.update('q-1', 'hacker', {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deve remover se for dono', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 'q-1',
        creatorId: 'user-1',
      } as any);
      await service.remove('q-1', 'user-1');
      expect(prismaMock.question.delete).toHaveBeenCalled();
    });
  });

  it('deve lançar Forbidden ao remover se não for dono', async () => {
    prismaMock.question.findUnique.mockResolvedValue({
      id: 'q-1',
      creatorId: 'user-1',
    } as any);
    await expect(service.remove('q-1', 'hacker')).rejects.toThrow(
      ForbiddenException,
    );
  });

  describe('findMyQuestions', () => {
    it('deve retornar lista paginada de questões do usuário', async () => {
      prismaMock.question.count.mockResolvedValue(2);
      prismaMock.question.findMany.mockResolvedValue([
        { id: 'q-1' } as any,
        { id: 'q-2' } as any,
      ]);
      const res = await service.findMyQuestions('user-1', {
        page: 1,
        perPage: 10,
      } as any);
      expect(res.data).toHaveLength(2);
      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: 'user-1',
          }),
        }),
      );
    });
  });
});
