import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Request,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FindQuestionsDto } from './dto/find-questions.dto';

@ApiTags('Questões')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Criar uma nova questão (Apenas Professor)' })
  @ApiResponse({ status: 201, description: 'Questão criada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (Schema Validation).',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado (Token inválido).' })
  @ApiResponse({ status: 403, description: 'Proibido (Apenas professores).' })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(req.user.sub, createQuestionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar questões (Filtros, Busca e Paginação)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de questões retornada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de consulta inválidos.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  findAll(@Query() query: FindQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get('me')
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Listar apenas as questões criadas por mim' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findMyQuestions(
    @Request() req: AuthenticatedRequest,
    @Query() query: FindQuestionsDto,
  ) {
    return this.questionsService.findMyQuestions(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar questão por ID' })
  @ApiResponse({ status: 200, description: 'Questão encontrada.' })
  @ApiResponse({ status: 400, description: 'ID inválido (deve ser UUID).' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Atualizar questão (Apenas Professor criador)' })
  @ApiResponse({ status: 200, description: 'Questão atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ID incorreto.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({
    status: 403,
    description: 'Proibido (Não é o dono ou é Aluno).',
  })
  @ApiResponse({ status: 404, description: 'Questão não encontrada.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, req.user.sub, updateQuestionDto);
  }

  @Delete(':id')
  @Roles('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar questão (Apenas Professor criador)' })
  @ApiResponse({ status: 204, description: 'Questão deletada com sucesso.' })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({
    status: 403,
    description: 'Proibido (Não é o dono ou é Aluno).',
  })
  @ApiResponse({ status: 404, description: 'Questão não encontrada.' })
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.questionsService.remove(id, req.user.sub);
  }
}
