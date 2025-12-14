import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createDisciplineSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome da disciplina deve ter pelo menos 3 caracteres'),
});

export class CreateDisciplineDto extends createZodDto(createDisciplineSchema) {}
