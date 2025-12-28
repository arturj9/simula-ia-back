import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { ExportModule } from 'src/export/export.module';

@Module({
  imports: [PrismaModule, AuthModule, AiModule, ExportModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
