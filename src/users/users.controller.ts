import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { UpdateUserDto } from './dto/updateUser.dto';
import { UsersService } from './users.service';

@ApiTags('Usuários')
@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver perfil logado' })
  @ApiResponse({
    status: 200,
    description: 'Dados do perfil retornados com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.sub);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar o próprio perfil' })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso.',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar o próprio perfil' })
  @ApiResponse({
    status: 204,
    description: 'Perfil deletado com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Request() req: AuthenticatedRequest) {
    await this.usersService.delete(req.user.sub);
  }
}
