import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let jwtMock: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    jwtMock = mockDeep<JwtService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('deve criar um usuário com sucesso', async () => {
      const dto = {
        name: 'Teste',
        email: 'novo@teste.com',
        password: '123',
        role: 'STUDENT' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      prismaMock.user.create.mockResolvedValue({
        id: 'uuid-gerado',
        ...dto,
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.signUp(dto);

      expect(result).toHaveProperty('id', 'uuid-gerado');
      expect(result).toHaveProperty('email', dto.email);
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('deve falhar se o email já existe', async () => {
      const dto = {
        name: 'Teste',
        email: 'existente@teste.com',
        password: '123',
        role: 'STUDENT' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue({ id: 'abc' } as any);

      await expect(service.signUp(dto)).rejects.toThrow(ConflictException);
    });

    it('deve falhar se ocorrer um erro interno', async () => {
      const dto = {
        name: 'Teste',
        email: 'erro@teste.com',
        password: '123',
        role: 'STUDENT' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockRejectedValue(new Error('Erro interno'));

      await expect(service.signUp(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('signIn', () => {
    it('deve retornar token JWT se credenciais válidas', async () => {
      const dto = { email: 'teste@teste.com', password: '123' };
      const hashedPassword = await bcrypt.hash('123', 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'uuid-user',
        email: dto.email,
        passwordHash: hashedPassword,
        role: 'STUDENT',
      } as any);

      jwtMock.signAsync.mockResolvedValue('token_valido_mock');

      const result = await service.signIn(dto);

      expect(result).toEqual({ accessToken: 'token_valido_mock' });
    });

    it('deve falhar se a senha estiver errada', async () => {
      const dto = { email: 'teste@teste.com', password: 'senha_errada' };
      const hashedPassword = await bcrypt.hash('senha_certa', 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'uuid-user',
        email: dto.email,
        passwordHash: hashedPassword,
      } as any);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve falhar se o email não existir', async () => {
      const dto = { email: 'nao_existe@teste.com', password: '123' };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve falhar se ocorrer um erro interno', async () => {
      const dto = { email: 'teste@teste.com', password: '123' };

      prismaMock.user.findUnique.mockRejectedValue(new Error('Erro interno'));

      await expect(service.signIn(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
