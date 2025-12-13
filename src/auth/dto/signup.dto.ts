import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.email({ message: 'Formato de e-mail inválido' }),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['PROFESSOR', 'STUDENT']).default('STUDENT'),
});

export class SignUpDto extends createZodDto(signUpSchema) {}
