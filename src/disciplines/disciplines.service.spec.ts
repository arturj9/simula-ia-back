import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinesService } from './disciplines.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('DisciplinesService', () => {
  let service: DisciplinesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplinesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DisciplinesService>(DisciplinesService);
  });

  describe('create', () => {
    it('deve criar uma disciplina com sucesso', async () => {
      const dto = { name: 'Matemática' };
      prismaMock.discipline.create.mockResolvedValue({
        id: 'uuid-1',
        ...dto,
      } as any);

      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Matemática');
    });

    it('deve lançar ConflictException se o nome já existir (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Duplicate entry',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prismaMock.discipline.create.mockRejectedValue(prismaError);

      await expect(service.create({ name: 'Matemática' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve lançar InternalServerErrorException para outros erros', async () => {
      prismaMock.discipline.create.mockRejectedValue(
        new Error('Erro aleatório'),
      );
      await expect(service.create({ name: 'Teste' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de disciplinas', async () => {
      prismaMock.discipline.findMany.mockResolvedValue([
        { id: '1', name: 'A' },
      ] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('deve retornar disciplina se existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({
        id: '1',
        name: 'A',
      } as any);
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });

    it('deve lançar NotFoundException se não existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar com sucesso', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaMock.discipline.update.mockResolvedValue({
        id: '1',
        name: 'Novo Nome',
      } as any);

      const result = await service.update('1', { name: 'Novo Nome' });
      expect(result.name).toBe('Novo Nome');
    });

    it('deve lançar ConflictException se o novo nome já existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Duplicate entry',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prismaMock.discipline.update.mockRejectedValue(prismaError);

      await expect(service.update('1', { name: 'Existente' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve lançar InternalServerErrorException para outros erros', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaMock.discipline.update.mockRejectedValue(
        new Error('Erro aleatório'),
      );
      await expect(service.update('1', { name: 'Teste' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('deve deletar com sucesso', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaMock.discipline.delete.mockResolvedValue({} as any);

      await service.remove('1');
      expect(prismaMock.discipline.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('deve lançar BadRequestException se houver questões vinculadas (P2003)', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' },
      );

      prismaMock.discipline.delete.mockRejectedValue(prismaError);

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException se disciplina não existir', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue(null);
      await expect(service.remove('99')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar InternalServerErrorException para outros erros', async () => {
      prismaMock.discipline.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaMock.discipline.delete.mockRejectedValue(
        new Error('Erro aleatório'),
      );
      await expect(service.remove('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
