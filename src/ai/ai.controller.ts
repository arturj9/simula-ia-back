import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateQuestionDto } from './dto/generate-question.dto';
import { AIResponse } from './ai.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('ai')
@UseGuards(AuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @Roles('PROFESSOR')
  async generate(@Body() dto: GenerateQuestionDto): Promise<AIResponse> {
    return this.aiService.generateQuestion(dto);
  }
}
