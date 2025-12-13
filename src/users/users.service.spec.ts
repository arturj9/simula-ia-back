import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('deve retornar o usuário se encontrado', async () => {
      const user = {
        id: 'uuid-1',
        name: 'Artur',
        email: 'a@a.com',
        role: 'STUDENT',
        createdAt: new Date(),
        passwordHash: 'hash',
        updatedAt: new Date(),
      };
      // @ts-expect-error - ignorando erro de tipagem estrita do mock do prisma retorno parcial
      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(user);
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerErrorException em caso de erro no banco', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Erro DB'));

      await expect(service.findOne('uuid-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar o usuário e retornar os dados', async () => {
      const updatedUser = { id: 'uuid-1', name: 'Novo Nome' };
      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await service.update('uuid-1', { name: 'Novo Nome' });

      expect(result).toEqual(updatedUser);
    });

    it('deve lançar InternalServerErrorException se falhar', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('Erro DB'));

      await expect(
        service.update('uuid-1', { name: 'Novo Nome' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    it('deve deletar o usuário com sucesso (void)', async () => {
      prismaMock.user.delete.mockResolvedValue({} as any);

      const result = await service.delete('uuid-1');

      expect(result).toBeUndefined();
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('deve lançar InternalServerErrorException se falhar', async () => {
      prismaMock.user.delete.mockRejectedValue(new Error('Erro DB'));

      await expect(service.delete('uuid-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
