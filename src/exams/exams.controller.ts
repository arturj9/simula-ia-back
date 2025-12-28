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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto, GenerateExamConfigDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { FindExamsDto } from './dto/find-exams.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { PdfService } from '../export/pdf.service';
import { DocxService } from '../export/docx.service';
import { ExportExamData } from '../export/export.interfaces';

@ApiTags('Provas (Simulados)')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly pdfService: PdfService,
    private readonly docxService: DocxService,
  ) {}

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
  async previewGeneration(@Body() config: GenerateExamConfigDto) {
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

  @Get(':id/download')
  @Roles('PROFESSOR', 'STUDENT')
  @ApiOperation({ summary: 'Baixar a prova em PDF ou Word' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['pdf', 'docx'],
    description: 'Formato do arquivo (padrão: pdf)',
  })
  @ApiResponse({ status: 200, description: 'Arquivo gerado e baixado.' })
  async downloadExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ) {
    const exam = await this.examsService.findOne(id);

    const exportData: ExportExamData = {
      title: exam.title,
      description: exam.description,
      creator: exam.creator,
      questions: exam.questions.map((item) => ({
        question: {
          statement: item.question.statement,
          type: item.question.type,
          alternatives: Array.isArray(item.question.alternatives)
            ? item.question.alternatives.map((alt) => {
                if (typeof alt === 'object' && alt !== null && 'text' in alt) {
                  return { text: String((alt as { text: unknown }).text) };
                }
                if (typeof alt === 'object') {
                  return { text: JSON.stringify(alt) };
                }
                return { text: String(alt) };
              })
            : [],
        },
      })),
    };

    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'docx') {
      buffer = await this.docxService.generateExamDocx(exportData);
      mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extension = 'docx';
    } else {
      buffer = await this.pdfService.generateExamPdf(exportData);
      mimeType = 'application/pdf';
      extension = 'pdf';
    }

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="prova-${id}.${extension}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
