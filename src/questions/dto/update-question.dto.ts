import { createZodDto } from 'nestjs-zod';
import { createQuestionSchema } from './create-question.dto';

const updateQuestionSchema = createQuestionSchema.partial();

export class UpdateQuestionDto extends createZodDto(updateQuestionSchema) {}
