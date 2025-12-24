import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createExamSchema = z
  .object({
    title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
    description: z.string().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),

    questionIds: z.array(z.uuid()).optional(),

    generateConfig: z
      .object({
        disciplineId: z.uuid(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
        count: z.number().min(1).max(50).default(10),
      })
      .optional(),
  })
  .refine((data) => data.questionIds || data.generateConfig, {
    message:
      'Você deve fornecer uma lista de questões OU uma configuração para gerar automaticamente.',
    path: ['questionIds'],
  });

export class CreateExamDto extends createZodDto(createExamSchema) {}
