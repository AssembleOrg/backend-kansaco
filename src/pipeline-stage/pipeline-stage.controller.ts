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
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PipelineStageService } from './pipeline-stage.service';
import { PipelineStageCreateDto } from './dto/pipeline-stage-create.dto';
import { PipelineStageUpdateDto } from './dto/pipeline-stage-update.dto';
import { PipelineStageReorderDto } from './dto/pipeline-stage-reorder.dto';
import { TerminalReasonCreateDto } from './dto/terminal-reason-create.dto';
import { TerminalReasonUpdateDto } from './dto/terminal-reason-update.dto';
import {
  PipelineStageResponseDto,
  TerminalReasonResponseDto,
} from './dto/pipeline-stage-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('crm/pipeline-stage')
@ApiTags('Kansaco - CRM Pipeline Stage')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PipelineStageController {
  constructor(private readonly stageService: PipelineStageService) {}

  @Get()
  @ApiOperation({ summary: 'Listar etapas del pipeline (ordenadas)' })
  @ApiOkResponse({ type: [PipelineStageResponseDto] })
  async findAll(): Promise<PipelineStageResponseDto[]> {
    return this.stageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de etapa' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PipelineStageResponseDto> {
    return this.stageService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear etapa' })
  async create(
    @Body(ValidationPipe) dto: PipelineStageCreateDto,
  ): Promise<PipelineStageResponseDto> {
    return this.stageService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar etapa' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: PipelineStageUpdateDto,
  ): Promise<PipelineStageResponseDto> {
    return this.stageService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar etapa' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.stageService.delete(id);
    return { message: 'Etapa eliminada' };
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reordenar etapas (ids en orden deseado)' })
  async reorder(
    @Body(ValidationPipe) dto: PipelineStageReorderDto,
  ): Promise<PipelineStageResponseDto[]> {
    return this.stageService.reorder(dto);
  }

  @Post(':id/reason')
  @ApiOperation({ summary: 'Agregar motivo a etapa terminal' })
  async addReason(
    @Param('id', ParseIntPipe) stageId: number,
    @Body(ValidationPipe) dto: TerminalReasonCreateDto,
  ): Promise<TerminalReasonResponseDto> {
    return this.stageService.addReason(stageId, dto);
  }

  @Put('reason/:reasonId')
  @ApiOperation({ summary: 'Actualizar motivo terminal' })
  async updateReason(
    @Param('reasonId', ParseIntPipe) reasonId: number,
    @Body(ValidationPipe) dto: TerminalReasonUpdateDto,
  ): Promise<TerminalReasonResponseDto> {
    return this.stageService.updateReason(reasonId, dto);
  }

  @Delete('reason/:reasonId')
  @ApiOperation({ summary: 'Eliminar motivo terminal' })
  async deleteReason(
    @Param('reasonId', ParseIntPipe) reasonId: number,
  ): Promise<{ message: string }> {
    await this.stageService.deleteReason(reasonId);
    return { message: 'Motivo eliminado' };
  }
}
