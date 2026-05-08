import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PipelineStage } from './pipeline-stage.entity';
import { TerminalReason } from './terminal-reason.entity';
import { PipelineStageCreateDto } from './dto/pipeline-stage-create.dto';
import { PipelineStageUpdateDto } from './dto/pipeline-stage-update.dto';
import { PipelineStageReorderDto } from './dto/pipeline-stage-reorder.dto';
import { TerminalReasonCreateDto } from './dto/terminal-reason-create.dto';
import { TerminalReasonUpdateDto } from './dto/terminal-reason-update.dto';
import {
  PipelineStageResponseDto,
  TerminalReasonResponseDto,
} from './dto/pipeline-stage-response.dto';
import { formatDateISO } from '../helpers/date.helper';

@Injectable()
export class PipelineStageService {
  private readonly logger = new Logger(PipelineStageService.name);

  constructor(
    @InjectRepository(PipelineStage)
    private readonly stageRepository: Repository<PipelineStage>,
    @InjectRepository(TerminalReason)
    private readonly reasonRepository: Repository<TerminalReason>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<PipelineStageResponseDto[]> {
    const stages = await this.stageRepository.find({
      relations: ['reasons'],
      order: { orden: 'ASC' },
    });
    return stages.map((s) => this.toStageDto(s));
  }

  async findOne(id: number): Promise<PipelineStageResponseDto> {
    const stage = await this.findStageEntity(id);
    return this.toStageDto(stage);
  }

  async findStageEntity(id: number): Promise<PipelineStage> {
    const stage = await this.stageRepository.findOne({
      where: { id },
      relations: ['reasons'],
    });
    if (!stage) {
      throw new NotFoundException(`Stage ${id} no encontrado`);
    }
    return stage;
  }

  async create(
    dto: PipelineStageCreateDto,
  ): Promise<PipelineStageResponseDto> {
    const nombre = dto.nombre.trim();
    const existing = await this.stageRepository.findOne({ where: { nombre } });
    if (existing) {
      throw new BadRequestException(
        `Ya existe una etapa con nombre "${nombre}"`,
      );
    }
    if (dto.isTerminal && !dto.terminalKind) {
      throw new BadRequestException(
        'terminalKind es requerido cuando isTerminal=true',
      );
    }
    const stage = this.stageRepository.create({
      nombre,
      orden: dto.orden,
      color: dto.color ?? '#64748b',
      probability: dto.probability ?? 0,
      isTerminal: dto.isTerminal ?? false,
      terminalKind: dto.isTerminal ? (dto.terminalKind ?? null) : null,
    });
    const saved = await this.stageRepository.save(stage);
    saved.reasons = [];
    return this.toStageDto(saved);
  }

  async update(
    id: number,
    dto: PipelineStageUpdateDto,
  ): Promise<PipelineStageResponseDto> {
    const stage = await this.findStageEntity(id);

    if (dto.nombre !== undefined) {
      await this.applyNombreChange(stage, dto.nombre);
    }
    if (dto.orden !== undefined) stage.orden = dto.orden;
    if (dto.color !== undefined) stage.color = dto.color;
    if (dto.probability !== undefined) stage.probability = dto.probability;

    this.applyTerminalFields(stage, dto);

    const saved = await this.stageRepository.save(stage);
    return this.toStageDto(saved);
  }

  private async applyNombreChange(
    stage: PipelineStage,
    nuevoNombreRaw: string,
  ): Promise<void> {
    const nuevoNombre = nuevoNombreRaw.trim();
    if (nuevoNombre === stage.nombre) return;
    const dup = await this.stageRepository.findOne({
      where: { nombre: nuevoNombre },
    });
    if (dup) {
      throw new BadRequestException(
        `Ya existe una etapa con nombre "${nuevoNombre}"`,
      );
    }
    stage.nombre = nuevoNombre;
  }

  private applyTerminalFields(
    stage: PipelineStage,
    dto: PipelineStageUpdateDto,
  ): void {
    if (dto.isTerminal !== undefined) {
      stage.isTerminal = dto.isTerminal;
      if (!dto.isTerminal) stage.terminalKind = null;
    }
    if (dto.terminalKind !== undefined) {
      if (!stage.isTerminal && dto.terminalKind) {
        throw new BadRequestException(
          'No se puede asignar terminalKind si isTerminal=false',
        );
      }
      stage.terminalKind = dto.terminalKind ?? null;
    }
    if (stage.isTerminal && !stage.terminalKind) {
      throw new BadRequestException(
        'Una etapa terminal debe tener terminalKind (WON o LOST)',
      );
    }
  }

  async delete(id: number): Promise<void> {
    const stage = await this.findStageEntity(id);
    await this.stageRepository.remove(stage);
    this.logger.log(`Stage eliminado: id=${id}`);
  }

  async reorder(dto: PipelineStageReorderDto): Promise<PipelineStageResponseDto[]> {
    const ids = dto.stageIds;
    const stages = await this.stageRepository.findBy({ id: In(ids) });
    if (stages.length !== ids.length) {
      throw new BadRequestException(
        'Algunos IDs de etapa no existen en la base',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < ids.length; i++) {
        await manager.update(PipelineStage, ids[i], { orden: i + 1 });
      }
    });
    return this.findAll();
  }

  async addReason(
    stageId: number,
    dto: TerminalReasonCreateDto,
  ): Promise<TerminalReasonResponseDto> {
    const stage = await this.findStageEntity(stageId);
    if (!stage.isTerminal) {
      throw new BadRequestException(
        'Solo se pueden agregar motivos a etapas terminales',
      );
    }
    const motivo = dto.motivo.trim();
    const dup = await this.reasonRepository.findOne({
      where: { stageId, motivo },
    });
    if (dup) {
      throw new BadRequestException(
        `Ya existe el motivo "${motivo}" para esta etapa`,
      );
    }
    const reason = this.reasonRepository.create({
      stageId,
      motivo,
      orden: dto.orden ?? 0,
    });
    const saved = await this.reasonRepository.save(reason);
    return this.toReasonDto(saved);
  }

  async updateReason(
    reasonId: number,
    dto: TerminalReasonUpdateDto,
  ): Promise<TerminalReasonResponseDto> {
    const reason = await this.reasonRepository.findOne({
      where: { id: reasonId },
    });
    if (!reason) {
      throw new NotFoundException(`Motivo ${reasonId} no encontrado`);
    }
    if (dto.motivo !== undefined) {
      const nuevoMotivo = dto.motivo.trim();
      if (nuevoMotivo !== reason.motivo) {
        const dup = await this.reasonRepository.findOne({
          where: { stageId: reason.stageId, motivo: nuevoMotivo },
        });
        if (dup) {
          throw new BadRequestException(
            `Ya existe el motivo "${nuevoMotivo}" para esta etapa`,
          );
        }
        reason.motivo = nuevoMotivo;
      }
    }
    if (dto.orden !== undefined) reason.orden = dto.orden;
    const saved = await this.reasonRepository.save(reason);
    return this.toReasonDto(saved);
  }

  async deleteReason(reasonId: number): Promise<void> {
    const reason = await this.reasonRepository.findOne({
      where: { id: reasonId },
    });
    if (!reason) {
      throw new NotFoundException(`Motivo ${reasonId} no encontrado`);
    }
    await this.reasonRepository.remove(reason);
  }

  private toStageDto(stage: PipelineStage): PipelineStageResponseDto {
    const reasons = (stage.reasons ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((r) => this.toReasonDto(r));
    return {
      id: stage.id,
      nombre: stage.nombre,
      orden: stage.orden,
      color: stage.color,
      probability: stage.probability,
      isTerminal: stage.isTerminal,
      terminalKind: stage.terminalKind,
      reasons,
      createdAt: formatDateISO(stage.createdAt) || '',
      updatedAt: formatDateISO(stage.updatedAt) || '',
    };
  }

  private toReasonDto(reason: TerminalReason): TerminalReasonResponseDto {
    return {
      id: reason.id,
      stageId: reason.stageId,
      motivo: reason.motivo,
      orden: reason.orden,
    };
  }
}
