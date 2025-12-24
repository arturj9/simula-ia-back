import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('ExamsService', () => {
  let service: ExamsService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  describe('create', () => {
    it('deve criar prova manual com sucesso', async () => {
      const dto = {
        title: 'Prova 1',
        visibility: 'PRIVATE' as const,
        questionIds: ['q-1'],
      };

      prismaMock.exam.create.mockResolvedValue({ id: 'ex-1', ...dto } as any);
      prismaMock.question.count.mockResolvedValue(1);
      prismaMock.exam.findUnique.mockResolvedValue({ id: 'ex-1' } as any);

      await service.create('user-1', dto);

      expect(prismaMock.examQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examId: 'ex-1',
            questionId: 'q-1',
            order: 1,
          }),
        }),
      );
    });

    it('deve fazer rollback (deletar prova) se falhar ao vincular questões', async () => {
      const dto = { title: 'Prova Falha', questionIds: ['q-1'] };

      prismaMock.exam.create.mockResolvedValue({ id: 'ex-1' } as any);
      prismaMock.question.count.mockRejectedValue(new Error('Erro DB'));

      await expect(service.create('user-1', dto as any)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
      });
    });
  });

  describe('findAll (Público)', () => {
    it('deve forçar filtro PUBLIC', async () => {
      prismaMock.exam.count.mockResolvedValue(0);
      prismaMock.exam.findMany.mockResolvedValue([]);

      await service.findAll({ page: 1, perPage: 10 });

      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibility: 'PUBLIC' }),
        }),
      );
    });
  });

  describe('findMyExams (Privado)', () => {
    it('deve filtrar pelo creatorId', async () => {
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

  describe('update', () => {
    it('deve atualizar se for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: 'ex-1',
        creatorId: 'user-1',
      } as any);

      await service.update('ex-1', 'user-1', { title: 'Novo Título' });

      expect(prismaMock.exam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ex-1' },
          data: expect.objectContaining({ title: 'Novo Título' }),
        }),
      );
    });

    it('deve lançar ForbiddenException se não for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: 'ex-1',
        creatorId: 'user-1',
      } as any);

      await expect(
        service.update('ex-1', 'user-2', { title: 'Hacker' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deve deletar se for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: 'ex-1',
        creatorId: 'user-1',
      } as any);

      await service.remove('ex-1', 'user-1');

      expect(prismaMock.exam.delete).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
      });
    });

    it('deve lançar ForbiddenException se não for o dono', async () => {
      prismaMock.exam.findUnique.mockResolvedValue({
        id: 'ex-1',
        creatorId: 'user-1',
      } as any);

      await expect(service.remove('ex-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
