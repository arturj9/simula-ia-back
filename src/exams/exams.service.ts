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
import { AiService } from '../ai/ai.service';
import { CreateQuestionDto } from '../questions/dto/create-question.dto';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async previewAiGeneration(
    config: NonNullable<CreateExamDto['generateConfig']>,
  ) {
    const itemsToGenerate = config.items ?? [];

    if (!config.useAI || itemsToGenerate.length === 0) {
      throw new BadRequestException(
        'Configuração inválida para IA. Defina "items" e useAI=true.',
      );
    }

    const discipline = await this.prisma.discipline.findUnique({
      where: { id: config.disciplineId },
    });
    if (!discipline) throw new NotFoundException('Disciplina não encontrada.');

    const promises: Promise<CreateQuestionDto>[] = [];

    for (const item of itemsToGenerate) {
      for (let i = 0; i < item.count; i++) {
        promises.push(
          this.aiService
            .generateQuestion({
              topic: `${discipline.name}: ${item.topic}`,
              difficulty: item.difficulty,
              type: item.type,
              baseQuestionIds: item.baseQuestionIds,
              generalContext: config.generalPrompt,
            })
            .then((result) => ({
              statement: result.statement,
              difficulty: item.difficulty,
              type: item.type,
              alternatives: result.alternatives ?? [],
              correctAnswer: result.correctAnswer,
              explanation: result.explanation,
              disciplineId: config.disciplineId,
            })),
        );
      }
    }

    try {
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Erro ao gerar preview da IA.');
    }
  }

  async create(userId: string, data: CreateExamDto) {
    const exam = await this.prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        creatorId: userId,
        visibility: data.visibility,
        disciplineId:
          data.generateConfig?.disciplineId ||
          data.newQuestions?.[0]?.disciplineId,
      },
    });

    try {
      const allQuestionIds: string[] = [];

      if (data.questionIds && data.questionIds.length > 0) {
        const manualIds = await this.validateAndGetManualIds(data.questionIds);
        allQuestionIds.push(...manualIds);
      }

      if (data.newQuestions && data.newQuestions.length > 0) {
        for (const qDto of data.newQuestions) {
          const createdQ = await this.prisma.question.create({
            data: {
              statement: qDto.statement,
              difficulty: qDto.difficulty,
              type: qDto.type,
              alternatives: qDto.alternatives ?? [],
              correctAnswer: qDto.correctAnswer,
              disciplineId: qDto.disciplineId || exam.disciplineId,
              creatorId: userId,
            },
          });
          allQuestionIds.push(createdQ.id);
        }
      }

      if (data.generateConfig) {
        const generatedIds = await this.generateQuestions(
          userId,
          data.generateConfig,
        );
        allQuestionIds.push(...generatedIds);
      }

      if (allQuestionIds.length === 0) {
        throw new BadRequestException(
          'A prova precisa ter pelo menos uma questão.',
        );
      }

      await Promise.all(
        allQuestionIds.map((questionId, index) =>
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
      console.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao criar a prova. Tente novamente.',
      );
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

    return this.executeQuery(where, page, perPage);
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

    return this.executeQuery(where, page, perPage);
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
    const exam = await this.prisma.exam.findUnique({ where: { id } });

    if (!exam) throw new NotFoundException('Prova não encontrada.');
    if (exam.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta prova.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const { questions, ...examData } = data;

      await tx.exam.update({
        where: { id },
        data: examData,
      });

      if (questions) {
        if (questions.length === 0)
          throw new BadRequestException('A prova não pode ficar vazia.');

        const count = await tx.question.count({
          where: { id: { in: questions } },
        });
        if (count !== questions.length)
          throw new NotFoundException('Algumas questões não existem.');

        await tx.examQuestion.deleteMany({ where: { examId: id } });

        await Promise.all(
          questions.map((questionId, index) =>
            tx.examQuestion.create({
              data: {
                examId: id,
                questionId: questionId,
                order: index + 1,
              },
            }),
          ),
        );
      }

      return tx.exam.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { question: true },
          },
        },
      });
    });
  }

  async remove(id: string, userId: string) {
    const exam = await this.findOne(id);
    if (exam.creatorId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir esta prova.',
      );
    }
    await this.prisma.exam.delete({ where: { id } });
  }

  private async executeQuery(
    where: Prisma.ExamWhereInput,
    page?: number,
    perPage?: number,
  ) {
    const safePage = page && page > 0 ? Number(page) : 1;
    const safePerPage = perPage && perPage > 0 ? Number(perPage) : 10;

    const [total, exams] = await Promise.all([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where,
        skip: (safePage - 1) * safePerPage,
        take: safePerPage,
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
      meta: {
        total,
        page: safePage,
        perPage: safePerPage,
        lastPage: Math.ceil(total / safePerPage) || 1,
      },
    };
  }

  private async generateQuestions(
    userId: string,
    config: NonNullable<CreateExamDto['generateConfig']>,
  ): Promise<string[]> {
    if (config.useAI) {
      if (!config.items || config.items.length === 0) {
        throw new BadRequestException(
          'Para usar IA, defina a lista de "items".',
        );
      }

      const discipline = await this.prisma.discipline.findUnique({
        where: { id: config.disciplineId },
      });
      if (!discipline)
        throw new NotFoundException('Disciplina não encontrada.');

      const newQuestionIds: string[] = [];
      const promises: Promise<any>[] = [];

      for (const item of config.items) {
        for (let i = 0; i < item.count; i++) {
          promises.push(
            this.aiService
              .generateQuestion({
                topic: `${discipline.name}: ${item.topic}`,
                difficulty: item.difficulty,
                type: item.type,
                baseQuestionIds: item.baseQuestionIds,
                generalContext: config.generalPrompt,
              })
              .then(async (result) => {
                const savedQuestion = await this.prisma.question.create({
                  data: {
                    statement: result.statement,
                    difficulty: item.difficulty,
                    type: item.type,
                    alternatives: result.alternatives ?? [],
                    correctAnswer: result.correctAnswer,
                    disciplineId: config.disciplineId,
                    creatorId: userId,
                  },
                });
                return savedQuestion.id;
              }),
          );
        }
      }

      const results = await Promise.all(promises);
      newQuestionIds.push(...results);
      return newQuestionIds;
    } else {
      if (!config.count)
        throw new BadRequestException('Defina "count" para geração aleatória.');
      return this.findRandomQuestionsFromDb(userId, config);
    }
  }

  private async findRandomQuestionsFromDb(
    userId: string,
    config: NonNullable<CreateExamDto['generateConfig']>,
  ): Promise<string[]> {
    const count = config.count ?? 0;

    const questions = await this.prisma.question.findMany({
      where: {
        disciplineId: config.disciplineId,
        difficulty: config.difficulty,
        creatorId: config.onlyMyQuestions ? userId : undefined,
      },
      select: { id: true },
    });

    if (questions.length < count) {
      throw new BadRequestException(
        `Não encontramos questões suficientes no banco. (Disponíveis: ${questions.length}, Solicitadas: ${count})`,
      );
    }

    const shuffled = this.shuffleArray(questions);
    return shuffled.slice(0, count).map((q) => q.id);
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

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
