import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
});

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
