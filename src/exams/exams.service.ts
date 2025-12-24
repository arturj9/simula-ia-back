import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { Prisma } from '@prisma/client';
import { FindExamsDto } from './dto/find-exams.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateExamDto) {
    const exam = await this.prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        creatorId: userId,
        visibility: data.visibility,
      },
    });

    try {
      let finalQuestionIds: string[] = [];
      if (data.questionIds?.length) {
        finalQuestionIds = await this.validateAndGetManualIds(data.questionIds);
      } else if (data.generateConfig) {
        finalQuestionIds = await this.generateQuestions(
          userId,
          data.generateConfig,
        );
      }

      await Promise.all(
        finalQuestionIds.map((questionId, index) =>
          this.prisma.examQuestion.create({
            data: {
              examId: exam.id,
              questionId: questionId,
              order: index + 1,
            },
          }),
        ),
      );
      return this.findOne(exam.id);
    } catch (error) {
      await this.prisma.exam.delete({ where: { id: exam.id } });
      throw new InternalServerErrorException('Erro ao gerar a prova.');
    }
  }

  private async generateQuestions(
    userId: string,
    config: NonNullable<CreateExamDto['generateConfig']>,
  ): Promise<string[]> {
    const useAI = false;

    if (useAI) {
      return [];
    } else {
      return this.findRandomQuestionsFromDb(config);
    }
  }

  async findAll(params: FindExamsDto) {
    const { page, perPage, search, disciplineId } = params;

    const where: Prisma.ExamWhereInput = {
      visibility: 'PUBLIC',
      disciplineId,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [total, exams] = await Promise.all([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { name: true } },
          discipline: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      }),
    ]);

    return {
      data: exams,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  async findMyExams(userId: string, params: FindExamsDto) {
    const { page, perPage, search, disciplineId, visibility } = params;

    const where: Prisma.ExamWhereInput = {
      creatorId: userId,
      visibility,
      disciplineId,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [total, exams] = await Promise.all([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          discipline: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      }),
    ]);

    return {
      data: exams,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: { discipline: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('Prova não encontrada.');
    return exam;
  }

  async update(id: string, userId: string, data: UpdateExamDto) {
    const exam = await this.findOne(id);

    if (exam.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta prova.',
      );
    }

    return this.prisma.exam.update({
      where: { id },
      data: { ...data },
    });
  }

  async remove(id: string, userId: string) {
    const exam = await this.findOne(id);

    if (exam.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir esta prova.',
      );
    }

    await this.prisma.exam.delete({
      where: { id },
    });
  }

  private async findRandomQuestionsFromDb(
    config: NonNullable<CreateExamDto['generateConfig']>,
  ): Promise<string[]> {
    const questions = await this.prisma.question.findMany({
      where: {
        disciplineId: config.disciplineId,
        difficulty: config.difficulty,
      },
      select: { id: true },
    });

    if (questions.length < config.count) {
      throw new BadRequestException(
        `Não encontramos questões suficientes no banco. (Disponíveis: ${questions.length}, Solicitadas: ${config.count})`,
      );
    }

    const shuffled = questions.sort(() => 0.5 - Math.random());

    const selected = shuffled.slice(0, config.count);

    return selected.map((q) => q.id);
  }

  private async validateAndGetManualIds(ids: string[]): Promise<string[]> {
    const count = await this.prisma.question.count({
      where: { id: { in: ids } },
    });

    if (count !== ids.length) {
      throw new NotFoundException(
        'Uma ou mais questões selecionadas não existem.',
      );
    }
    return ids;
  }
}
