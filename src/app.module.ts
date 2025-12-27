import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { QuestionsModule } from './questions/questions.module';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { ExamsModule } from './exams/exams.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    DisciplinesModule,
    ExamsModule,
    AiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
