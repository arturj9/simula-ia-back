import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FindQuestionsDto } from './dto/find-questions.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createQuestionDto: CreateQuestionDto) {
    if (createQuestionDto.disciplineId) {
      const discipline = await this.prisma.discipline.findUnique({
        where: { id: createQuestionDto.disciplineId },
      });
      if (!discipline) {
        throw new NotFoundException('Disciplina não encontrada.');
      }
    }

    return this.prisma.question.create({
      data: {
        ...createQuestionDto,
        creatorId: userId,
        alternatives: createQuestionDto.alternatives ?? [],
      },
    });
  }

  async findMyQuestions(sub: string, query: FindQuestionsDto) {
    const {
      page = 1,
      perPage = 10,
      search,
      disciplineId,
      difficulty,
      type,
    } = query;

    const where: Prisma.QuestionWhereInput = {
      creatorId: sub,
      disciplineId,
      difficulty,
      type,
      OR: search
        ? [{ statement: { contains: search, mode: 'insensitive' } }]
        : undefined,
    };

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { name: true, email: true },
          },
          discipline: {
            select: { name: true },
          },
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
  }

  async findAll(params: FindQuestionsDto) {
    const {
      page = 1,
      perPage = 10,
      search,
      disciplineId,
      difficulty,
      type,
    } = params;

    const where: Prisma.QuestionWhereInput = {
      disciplineId,
      difficulty,
      type,
      OR: search
        ? [{ statement: { contains: search, mode: 'insensitive' } }]
        : undefined,
    };

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { name: true, email: true },
          },
          discipline: {
            select: { name: true },
          },
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
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        discipline: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    if (!question) {
      throw new NotFoundException('Questão não encontrada.');
    }

    return question;
  }

  async update(
    id: string,
    userId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.findOne(id);

    if (question.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta questão.',
      );
    }

    return this.prisma.question.update({
      where: { id },
      data: updateQuestionDto,
    });
  }

  async remove(id: string, userId: string) {
    const question = await this.findOne(id);

    if (question.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir esta questão.',
      );
    }

    return this.prisma.question.delete({
      where: { id },
    });
  }
}
