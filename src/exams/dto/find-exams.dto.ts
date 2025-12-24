import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto';

const findExamsSchema = paginationSchema.extend({
  search: z.string().optional(),
  disciplineId: z.uuid().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export class FindExamsDto extends createZodDto(findExamsSchema) {}
