import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { SubmissionFilterDto } from './dto/submission-filter.dto';
import { SubmissionUpdateDto } from './dto/submission-update.dto';
import {
  SubmissionResponseDto,
  SubmissionStatsDto,
} from './dto/submission-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

/**
 * Gestión de solicitudes desde el panel. Guards a nivel de clase para que
 * ningún endpoint quede expuesto por olvido (mismo patrón que LeadController).
 */
@Controller('admin/submission')
@ApiTags('Kansaco - Solicitudes (admin)')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SubmissionAdminController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes' })
  @ApiOkResponse({ type: [SubmissionResponseDto] })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: SubmissionFilterDto,
  ): Promise<SubmissionResponseDto[]> {
    return this.submissionService.findAll(filters);
  }

  // Declarado antes de `:id` para que "stats" no se interprete como un id.
  @Get('stats')
  @ApiOperation({ summary: 'Cantidad de solicitudes sin leer' })
  @ApiOkResponse({ type: SubmissionStatsDto })
  async stats(): Promise<SubmissionStatsDto> {
    return { noLeidas: await this.submissionService.countNoLeidas() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una solicitud' })
  @ApiOkResponse({ type: SubmissionResponseDto })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubmissionResponseDto> {
    return this.submissionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Marcar leída / no leída y guardar nota interna' })
  @ApiOkResponse({ type: SubmissionResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: SubmissionUpdateDto,
  ): Promise<SubmissionResponseDto> {
    return this.submissionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una solicitud' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.submissionService.delete(id);
    return { message: 'Solicitud eliminada' };
  }
}
