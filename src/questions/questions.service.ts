import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FindQuestionsDto } from './dto/find-questions.dto';
import { Prisma } from '@prisma/client';
import tr from 'zod/v4/locales/tr.js';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateQuestionDto) {
    try {
      return await this.prisma.question.create({
        data: {
          statement: data.statement,
          correctAnswer: data.correctAnswer,
          difficulty: data.difficulty,
          type: data.type,
          alternatives: (data.alternatives as Prisma.InputJsonValue) ?? [],
          creatorId: userId,
          disciplineId: data.disciplineId,
        },
      });
    } catch (error) {
      console.error('Erro ao criar questão:', error);
      throw new InternalServerErrorException('Erro ao criar questão');
    }
  }

  async findAll(params: FindQuestionsDto) {
    try {
      const {
        page,
        perPage,
        search,
        difficulty,
        type,
        orderBy,
        order,
        disciplineId,
      } = params;

      const where: Prisma.QuestionWhereInput = {
        difficulty,
        type,
        disciplineId,
        statement: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
      };

      const [total, questions] = await Promise.all([
        this.prisma.question.count({ where }),

        this.prisma.question.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,

          orderBy: {
            [orderBy]: order,
          },

          include: {
            creator: { select: { name: true, email: true } },
          },
        }),
      ]);

      return {
        data: questions,
        meta: {
          total,
          page,
          perPage,
          lastPage: Math.ceil(total / perPage),
        },
      };
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      throw new InternalServerErrorException(
        'Não foi possível buscar as questões.',
      );
    }
  }

  async findMyQuestions(userId: string, params: FindQuestionsDto) {
    try {
      const {
        page,
        perPage,
        search,
        difficulty,
        type,
        orderBy,
        order,
        disciplineId,
      } = params;

      const where: Prisma.QuestionWhereInput = {
        creatorId: userId,
        difficulty,
        type,
        disciplineId,
        statement: search
          ? { contains: search, mode: 'insensitive' }
          : undefined,
      };

      const [total, questions] = await Promise.all([
        this.prisma.question.count({ where }),
        this.prisma.question.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { [orderBy]: order },
          include: {
            discipline: { select: { name: true } },
          },
        }),
      ]);

      return {
        data: questions,
        meta: {
          total,
          page,
          perPage,
          lastPage: Math.ceil(total / perPage),
        },
      };
    } catch (error) {
      console.error('Erro ao buscar minhas questões:', error);
      throw new InternalServerErrorException(
        'Não foi possível buscar suas questões.',
      );
    }
  }

  async findOne(id: string) {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id },
        include: { creator: { select: { name: true } } },
      });

      if (!question) {
        throw new NotFoundException('Questão não encontrada.');
      }
      return question;
    } catch (error) {
      console.error('Erro ao buscar questão:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Não foi possível buscar a questão.',
      );
    }
  }

  async update(id: string, userId: string, data: UpdateQuestionDto) {
    try {
      const question = await this.findOne(id);

      if (question.creatorId !== userId) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar esta questão.',
        );
      }

      const updateData: Prisma.QuestionUpdateInput = {
        statement: data.statement,
        correctAnswer: data.correctAnswer,
        difficulty: data.difficulty,
        type: data.type,
        discipline: data.disciplineId
          ? { connect: { id: data.disciplineId } }
          : undefined,
      };

      if (data.alternatives !== undefined) {
        updateData.alternatives = data.alternatives as Prisma.InputJsonValue;
      }

      return await this.prisma.question.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Erro ao atualizar questão:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Não foi possível atualizar a questão.',
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      const question = await this.findOne(id);

      if (question.creatorId !== userId) {
        throw new ForbiddenException(
          'Você não tem permissão para deletar esta questão.',
        );
      }

      await this.prisma.question.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Erro ao deletar questão:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Não foi possível deletar a questão.',
      );
    }
  }
}
