import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const generateQuestionSchema = z.object({
  topic: z.string().min(3),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  type: z.enum(['OBJECTIVE', 'DISCURSIVE', 'TRUE_FALSE', 'DRAWING']),

  baseQuestionIds: z.array(z.uuid()).optional(),

  generalContext: z.string().optional(),
});

export class GenerateQuestionDto extends createZodDto(generateQuestionSchema) {}
