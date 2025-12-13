import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.email({ message: 'Formato de e-mail inválido' }),
  password: z.string(),
});

export class SignInDto extends createZodDto(signInSchema) {}
