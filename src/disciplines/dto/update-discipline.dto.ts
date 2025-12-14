import { createZodDto } from 'nestjs-zod';
import { createDisciplineSchema } from './create-discipline.dto';

const updateDisciplineSchema = createDisciplineSchema.partial();

export class UpdateDisciplineDto extends createZodDto(updateDisciplineSchema) {}
