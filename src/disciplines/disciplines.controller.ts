import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Disciplinas')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Post()
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Criar nova disciplina (Apenas Professor)' })
  @ApiResponse({ status: 201, description: 'Disciplina criada.' })
  @ApiResponse({ status: 409, description: 'Nome já existe.' })
  create(@Body() createDisciplineDto: CreateDisciplineDto) {
    return this.disciplinesService.create(createDisciplineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as disciplinas' })
  findAll() {
    return this.disciplinesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar disciplina por ID' })
  @ApiResponse({ status: 200, description: 'Disciplina encontrada.' })
  @ApiResponse({ status: 404, description: 'Disciplina não encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.disciplinesService.findOne(id);
  }

  @Patch(':id')
  @Roles('PROFESSOR')
  @ApiOperation({ summary: 'Atualizar disciplina (Apenas Professor)' })
  @ApiResponse({ status: 200, description: 'Atualizado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Nome já em uso.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
  ) {
    return this.disciplinesService.update(id, updateDisciplineDto);
  }

  @Delete(':id')
  @Roles('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar disciplina (Apenas Professor)' })
  @ApiResponse({ status: 204, description: 'Deletado com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Não pode deletar pois tem questões vinculadas.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.disciplinesService.remove(id);
  }
}
