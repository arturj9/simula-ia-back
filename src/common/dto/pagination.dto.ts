import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const paginationSchema = z.object({
  // coerce transforma string "1" em number 1 automaticamente
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

export class PaginationDto extends createZodDto(paginationSchema) {}
