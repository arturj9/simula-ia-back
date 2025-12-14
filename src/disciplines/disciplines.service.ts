import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DisciplinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDisciplineDto) {
    try {
      return await this.prisma.discipline.create({
        data: { name: data.name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe uma disciplina com este nome.');
      }
      throw new InternalServerErrorException('Erro ao criar disciplina.');
    }
  }

  async findAll() {
    return this.prisma.discipline.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const discipline = await this.prisma.discipline.findUnique({
      where: { id },
    });

    if (!discipline) {
      throw new NotFoundException('Disciplina não encontrada.');
    }

    return discipline;
  }

  async update(id: string, data: UpdateDisciplineDto) {
    await this.findOne(id);

    try {
      return await this.prisma.discipline.update({
        where: { id },
        data: { ...data },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe outra disciplina com este nome.',
        );
      }
      throw new InternalServerErrorException('Erro ao atualizar disciplina.');
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    try {
      await this.prisma.discipline.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Não é possível deletar esta disciplina pois existem questões vinculadas a ela.',
        );
      }
      throw new InternalServerErrorException('Erro ao deletar disciplina.');
    }
  }
}
