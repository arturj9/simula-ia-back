import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado.');
      }
      return user;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Não foi possível buscar o usuário.',
      );
    }
  }

  async update(userId: string, data: { name: string }) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw new InternalServerErrorException(
        'Não foi possível atualizar o usuário.',
      );
    }
  }

  async delete(userId: string) {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw new InternalServerErrorException(
        'Não foi possível deletar o usuário.',
      );
    }
  }
}
