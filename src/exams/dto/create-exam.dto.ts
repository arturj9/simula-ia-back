import { createZodDto } from 'nestjs-zod';
import { createQuestionSchema } from '../../questions/dto/create-question.dto';
import { z } from 'zod';

const generationItemSchema = z.object({
  topic: z.string().min(3),
  count: z.number().min(1).max(10).default(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  type: z
    .enum(['OBJECTIVE', 'DISCURSIVE', 'TRUE_FALSE', 'DRAWING'])
    .default('OBJECTIVE'),
  baseQuestionIds: z.array(z.uuid()).optional(),
});

const createExamSchema = z
  .object({
    title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
    description: z.string().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),

    questionIds: z.array(z.uuid()).optional(),

    newQuestions: z.array(createQuestionSchema).optional(),

    generateConfig: z
      .object({
        useAI: z.boolean().default(false),
        items: z.array(generationItemSchema).optional(),
        onlyMyQuestions: z.boolean().default(false),
        disciplineId: z.uuid(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        count: z.number().min(1).max(50).default(10),
        generalPrompt: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const hasManual = data.questionIds && data.questionIds.length > 0;
      const hasNew = data.newQuestions && data.newQuestions.length > 0;
      const hasAuto = !!data.generateConfig;
      return hasManual || hasAuto || hasNew;
    },
    {
      message:
        'A prova precisa ter pelo menos uma questão (ID existente, Nova Questão ou Configuração Automática).',
      path: ['questionIds'],
    },
  );

export class CreateExamDto extends createZodDto(createExamSchema) {}
