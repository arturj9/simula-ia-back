import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateExamSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),

  questions: z.array(z.uuid()).optional(),
});

export class UpdateExamDto extends createZodDto(updateExamSchema) {}
