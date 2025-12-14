import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto';

const findQuestionsSchema = paginationSchema.extend({
  search: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  type: z.enum(['OBJECTIVE', 'DISCURSIVE', 'TRUE_FALSE', 'DRAWING']).optional(),

  disciplineId: z.uuid().optional(),

  orderBy: z
    .enum(['createdAt', 'statement', 'difficulty', 'type'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export class FindQuestionsDto extends createZodDto(findQuestionsSchema) {}
