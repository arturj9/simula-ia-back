import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
const TypeSchema = z.enum(['OBJECTIVE', 'DISCURSIVE', 'TRUE_FALSE', 'DRAWING']);

export const createQuestionSchema = z.object({
  statement: z.string().min(5, 'O enunciado deve ter pelo menos 5 caracteres'),

  correctAnswer: z.string({ error: 'A resposta correta é obrigatória' }),

  difficulty: DifficultySchema.default('MEDIUM'),

  type: TypeSchema.default('OBJECTIVE'),

  alternatives: z.any().optional(),

  disciplineId: z.uuid().optional(),
});

export class CreateQuestionDto extends createZodDto(createQuestionSchema) {}
