import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DealService } from './deal.service';
import { DealCreateDto } from './dto/deal-create.dto';
import { DealUpdateDto } from './dto/deal-update.dto';
import { DealFilterDto } from './dto/deal-filter.dto';
import { DealMoveStageDto } from './dto/deal-move-stage.dto';
import { DealNoteCreateDto } from './dto/deal-note-create.dto';
import {
  DealDetailResponseDto,
  DealNoteResponseDto,
  DealResponseDto,
  DealStageHistoryResponseDto,
} from './dto/deal-response.dto';
import { DealKanbanResponseDto } from './dto/deal-kanban-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('crm/deal')
@ApiTags('Kansaco - CRM Deal')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Get('kanban')
  @ApiOperation({ summary: 'Vista kanban: stages con deals + totales' })
  @ApiOkResponse({ type: DealKanbanResponseDto })
  async getKanban(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: DealFilterDto,
  ): Promise<DealKanbanResponseDto> {
    return this.dealService.getKanban(filters);
  }

  @Get()
  @ApiOperation({ summary: 'Listar deals (flat) con filtros' })
  @ApiOkResponse({ type: [DealResponseDto] })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: DealFilterDto,
  ): Promise<DealResponseDto[]> {
    return this.dealService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de deal con notas e historial' })
  @ApiOkResponse({ type: DealDetailResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DealDetailResponseDto> {
    return this.dealService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear deal (genera primer history entry)' })
  async create(
    @Body(ValidationPipe) dto: DealCreateDto,
  ): Promise<DealDetailResponseDto> {
    return this.dealService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar campos del deal (no la etapa)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: DealUpdateDto,
  ): Promise<DealDetailResponseDto> {
    return this.dealService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar deal' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.dealService.delete(id);
    return { message: 'Deal eliminado' };
  }

  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Mover deal a otra etapa (graba history; reasonId obligatorio si destino es terminal)',
  })
  async moveToStage(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: DealMoveStageDto,
  ): Promise<DealDetailResponseDto> {
    return this.dealService.moveToStage(id, dto);
  }

  @Post(':id/note')
  @ApiOperation({ summary: 'Agregar nota al deal' })
  async addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: DealNoteCreateDto,
  ): Promise<DealNoteResponseDto> {
    return this.dealService.addNote(id, dto);
  }

  @Get(':id/note')
  @ApiOperation({ summary: 'Listar notas del deal (más recientes primero)' })
  @ApiOkResponse({ type: [DealNoteResponseDto] })
  async listNotes(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DealNoteResponseDto[]> {
    return this.dealService.listNotes(id);
  }

  @Delete('note/:noteId')
  @ApiOperation({ summary: 'Eliminar una nota' })
  async deleteNote(
    @Param('noteId', ParseIntPipe) noteId: number,
  ): Promise<{ message: string }> {
    await this.dealService.deleteNote(noteId);
    return { message: 'Nota eliminada' };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Historial de cambios de etapa del deal' })
  @ApiOkResponse({ type: [DealStageHistoryResponseDto] })
  async listHistory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DealStageHistoryResponseDto[]> {
    return this.dealService.listHistory(id);
  }
}
