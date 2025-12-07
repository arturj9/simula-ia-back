import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const signInSchema = z.object({
  // ✅ Correto
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string(),
});

export class SignInDto extends createZodDto(signInSchema) {}
