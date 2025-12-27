import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { FindExamsDto } from './dto/find-exams.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@ApiTags('Provas (Simulados)')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Criar uma nova prova (Manual ou Gerada)' })
  @ApiResponse({ status: 201, description: 'Prova criada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Configuração inválida ou questões insuficientes.',
  })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.create(req.user.sub, createExamDto);
  }

  @Post('preview-ai')
  @Roles('PROFESSOR')
  @ApiOperation({
    summary: 'Gera questões com IA para curadoria (NÃO salva no banco)',
  })
  async previewGeneration(@Body() config: CreateExamDto['generateConfig']) {
    if (!config)
      throw new BadRequestException(
        'Configuração de geração é obrigatória para o preview.',
      );

    return this.examsService.previewAiGeneration(config);
  }

  @Get()
  @ApiOperation({ summary: 'Listar provas (Com filtros de busca e paginação)' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findAll(@Query() query: FindExamsDto) {
    return this.examsService.findAll(query);
  }

  @Get('me')
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Listar apenas os simulados criados por mim' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findMyExams(
    @Request() req: AuthenticatedRequest,
    @Query() query: FindExamsDto,
  ) {
    return this.examsService.findMyExams(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma prova (Questões inclusas)' })
  @ApiResponse({ status: 200, description: 'Prova encontrada.' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Editar prova (Título, Descrição, Visibilidade)' })
  @ApiResponse({ status: 200, description: 'Prova atualizada.' })
  @ApiResponse({ status: 403, description: 'Apenas o criador pode editar.' })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.update(id, req.user.sub, updateExamDto);
  }

  @Delete(':id')
  @Roles('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir prova' })
  @ApiResponse({ status: 204, description: 'Prova excluída com sucesso.' })
  @ApiResponse({ status: 403, description: 'Apenas o criador pode excluir.' })
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.examsService.remove(id, req.user.sub);
  }
}
