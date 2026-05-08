import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Deal } from './deal.entity';
import { DealStageHistory } from './deal-stage-history.entity';
import { DealNote } from './deal-note.entity';
import { Lead } from '../lead/lead.entity';
import { Vendor } from '../vendor/vendor.entity';
import { PipelineStage } from '../pipeline-stage/pipeline-stage.entity';
import { TerminalReason } from '../pipeline-stage/terminal-reason.entity';
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
import {
  DealKanbanColumnDto,
  DealKanbanResponseDto,
} from './dto/deal-kanban-response.dto';
import { formatDateISO } from '../helpers/date.helper';

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(DealStageHistory)
    private readonly historyRepo: Repository<DealStageHistory>,
    @InjectRepository(DealNote)
    private readonly noteRepo: Repository<DealNote>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(PipelineStage)
    private readonly stageRepo: Repository<PipelineStage>,
    @InjectRepository(TerminalReason)
    private readonly reasonRepo: Repository<TerminalReason>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: DealFilterDto = {}): Promise<DealResponseDto[]> {
    const qb = this.buildBaseQuery(filters);
    qb.orderBy('deal.updatedAt', 'DESC');
    const deals = await qb.getMany();
    return Promise.all(deals.map((d) => this.toResponseDto(d)));
  }

  async getKanban(filters: DealFilterDto = {}): Promise<DealKanbanResponseDto> {
    const stages = await this.stageRepo.find({ order: { orden: 'ASC' } });
    const qb = this.buildBaseQuery(filters);
    qb.orderBy('deal.updatedAt', 'DESC');
    const deals = await qb.getMany();

    const dealsByStage = new Map<number, Deal[]>();
    for (const stage of stages) dealsByStage.set(stage.id, []);
    for (const deal of deals) {
      const list = dealsByStage.get(deal.stageId);
      if (list) list.push(deal);
    }

    const columns: DealKanbanColumnDto[] = await Promise.all(
      stages.map(async (stage) => {
        const stageDeals = dealsByStage.get(stage.id) ?? [];
        const dealsDto = await Promise.all(
          stageDeals.map((d) => this.toResponseDto(d)),
        );
        const total = stageDeals.reduce(
          (acc, d) => acc + Number(d.monto ?? 0),
          0,
        );
        const totalPonderado = (total * stage.probability) / 100;
        return {
          id: stage.id,
          nombre: stage.nombre,
          orden: stage.orden,
          color: stage.color,
          probability: stage.probability,
          isTerminal: stage.isTerminal,
          terminalKind: stage.terminalKind,
          deals: dealsDto,
          cantidad: stageDeals.length,
          total: total.toFixed(2),
          totalPonderado: totalPonderado.toFixed(2),
        };
      }),
    );

    return { columns };
  }

  async findOne(id: number): Promise<DealDetailResponseDto> {
    const deal = await this.findEntityWithRelations(id);
    const base = await this.toResponseDto(deal);
    const notes = await this.listNotes(id);
    const history = await this.listHistory(id);
    return { ...base, notes, history };
  }

  async create(dto: DealCreateDto): Promise<DealDetailResponseDto> {
    const lead = await this.leadRepo.findOne({ where: { id: dto.leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead ${dto.leadId} no encontrado`);
    }
    if (dto.vendorId !== undefined) {
      const vendor = await this.vendorRepo.findOne({
        where: { id: dto.vendorId },
      });
      if (!vendor) {
        throw new NotFoundException(`Vendedor ${dto.vendorId} no encontrado`);
      }
    }
    const stage = await this.resolveInitialStage(dto.stageId);
    if (stage.isTerminal) {
      throw new BadRequestException(
        'No se puede crear un deal directamente en una etapa terminal',
      );
    }

    const dealId = await this.dataSource.transaction(async (manager) => {
      const deal = manager.create(Deal, {
        leadId: dto.leadId,
        vendorId: dto.vendorId ?? null,
        stageId: stage.id,
        currentReasonId: null,
        monto: dto.monto ?? null,
        fechaCierre: dto.fechaCierre ?? null,
      });
      const saved = await manager.save(deal);
      const history = manager.create(DealStageHistory, {
        dealId: saved.id,
        fromStageId: null,
        toStageId: stage.id,
        reasonId: null,
      });
      await manager.save(history);
      return saved.id;
    });

    return this.findOne(dealId);
  }

  async update(id: number, dto: DealUpdateDto): Promise<DealDetailResponseDto> {
    const deal = await this.findEntity(id);
    if (dto.vendorId !== undefined) {
      if (dto.vendorId !== null) {
        const vendor = await this.vendorRepo.findOne({
          where: { id: dto.vendorId },
        });
        if (!vendor) {
          throw new NotFoundException(`Vendedor ${dto.vendorId} no encontrado`);
        }
      }
      deal.vendorId = dto.vendorId;
    }
    if (dto.monto !== undefined) deal.monto = dto.monto;
    if (dto.fechaCierre !== undefined) deal.fechaCierre = dto.fechaCierre;
    await this.dealRepo.save(deal);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const deal = await this.findEntity(id);
    await this.dealRepo.remove(deal);
    this.logger.log(`Deal eliminado: id=${id}`);
  }

  async moveToStage(
    dealId: number,
    dto: DealMoveStageDto,
  ): Promise<DealDetailResponseDto> {
    const deal = await this.findEntity(dealId);
    if (dto.toStageId === deal.stageId) {
      throw new BadRequestException('La etapa destino es la misma que la actual');
    }
    const toStage = await this.stageRepo.findOne({
      where: { id: dto.toStageId },
    });
    if (!toStage) {
      throw new NotFoundException(`Etapa ${dto.toStageId} no encontrada`);
    }

    const reasonId = await this.resolveStageReason(toStage, dto.reasonId);

    await this.dataSource.transaction(async (manager) => {
      const fromStageId = deal.stageId;
      deal.stageId = toStage.id;
      deal.currentReasonId = reasonId;
      await manager.save(deal);
      const history = manager.create(DealStageHistory, {
        dealId: deal.id,
        fromStageId,
        toStageId: toStage.id,
        reasonId,
      });
      await manager.save(history);
    });

    return this.findOne(dealId);
  }

  async addNote(
    dealId: number,
    dto: DealNoteCreateDto,
  ): Promise<DealNoteResponseDto> {
    await this.findEntity(dealId);
    const note = this.noteRepo.create({
      dealId,
      contenido: dto.contenido.trim(),
    });
    const saved = await this.noteRepo.save(note);
    return this.toNoteDto(saved);
  }

  async listNotes(dealId: number): Promise<DealNoteResponseDto[]> {
    const notes = await this.noteRepo.find({
      where: { dealId },
      order: { createdAt: 'DESC' },
    });
    return notes.map((n) => this.toNoteDto(n));
  }

  async deleteNote(noteId: number): Promise<void> {
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Nota ${noteId} no encontrada`);
    }
    await this.noteRepo.remove(note);
  }

  async listHistory(dealId: number): Promise<DealStageHistoryResponseDto[]> {
    const history = await this.historyRepo.find({
      where: { dealId },
      relations: ['fromStage', 'toStage', 'reason'],
      order: { movedAt: 'DESC' },
    });
    return history.map((h) => ({
      id: h.id,
      fromStageId: h.fromStageId,
      fromStageNombre: h.fromStage?.nombre ?? null,
      toStageId: h.toStageId,
      toStageNombre: h.toStage.nombre,
      reasonId: h.reasonId,
      reasonMotivo: h.reason?.motivo ?? null,
      movedAt: formatDateISO(h.movedAt) || '',
    }));
  }

  private async findEntity(id: number): Promise<Deal> {
    const deal = await this.dealRepo.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} no encontrado`);
    }
    return deal;
  }

  private async findEntityWithRelations(id: number): Promise<Deal> {
    const deal = await this.dealRepo.findOne({
      where: { id },
      relations: ['lead', 'vendor', 'stage', 'currentReason'],
    });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} no encontrado`);
    }
    return deal;
  }

  private async resolveInitialStage(
    stageId: number | undefined,
  ): Promise<PipelineStage> {
    if (stageId !== undefined) {
      const stage = await this.stageRepo.findOne({ where: { id: stageId } });
      if (!stage) {
        throw new NotFoundException(`Etapa ${stageId} no encontrada`);
      }
      return stage;
    }
    const first = await this.stageRepo.findOne({
      where: { isTerminal: false },
      order: { orden: 'ASC' },
    });
    if (!first) {
      throw new BadRequestException(
        'No hay etapas no terminales configuradas para iniciar el deal',
      );
    }
    return first;
  }

  private async resolveStageReason(
    toStage: PipelineStage,
    reasonId?: number,
  ): Promise<number | null> {
    if (!toStage.isTerminal) {
      return null;
    }
    if (reasonId === undefined || reasonId === null) {
      throw new BadRequestException(
        'reasonId es requerido al mover a una etapa terminal',
      );
    }
    const reason = await this.reasonRepo.findOne({ where: { id: reasonId } });
    if (!reason) {
      throw new NotFoundException(`Motivo ${reasonId} no encontrado`);
    }
    if (reason.stageId !== toStage.id) {
      throw new BadRequestException(
        `El motivo ${reasonId} no pertenece a la etapa ${toStage.id}`,
      );
    }
    return reason.id;
  }

  private buildBaseQuery(filters: DealFilterDto): SelectQueryBuilder<Deal> {
    const qb = this.dealRepo
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.lead', 'lead')
      .leftJoinAndSelect('deal.vendor', 'vendor')
      .leftJoinAndSelect('deal.stage', 'stage')
      .leftJoinAndSelect('deal.currentReason', 'currentReason');

    if (filters.search) {
      qb.andWhere('LOWER(lead.nombre) LIKE :s', {
        s: `%${filters.search.toLowerCase()}%`,
      });
    }
    if (filters.vendorId) {
      qb.andWhere('deal.vendorId = :vid', { vid: filters.vendorId });
    }
    if (filters.stageId) {
      qb.andWhere('deal.stageId = :sid', { sid: filters.stageId });
    }
    if (filters.tipo) {
      qb.andWhere('lead.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.ciudad) {
      qb.andWhere('LOWER(lead.ciudad) = LOWER(:ciudad)', {
        ciudad: filters.ciudad,
      });
    }
    if (filters.provincia) {
      qb.andWhere('LOWER(lead.provincia) = LOWER(:provincia)', {
        provincia: filters.provincia,
      });
    }
    if (filters.fechaDesde) {
      qb.andWhere('deal.fechaCierre >= :desde', { desde: filters.fechaDesde });
    }
    if (filters.fechaHasta) {
      qb.andWhere('deal.fechaCierre <= :hasta', { hasta: filters.fechaHasta });
    }
    if (filters.includeTerminal === false) {
      qb.andWhere('stage.isTerminal = false');
    }
    return qb;
  }

  private async toResponseDto(deal: Deal): Promise<DealResponseDto> {
    if (!deal.lead || !deal.stage) {
      const fresh = await this.findEntityWithRelations(deal.id);
      deal.lead = fresh.lead;
      deal.vendor = fresh.vendor;
      deal.stage = fresh.stage;
      deal.currentReason = fresh.currentReason;
    }
    const lastNote = await this.noteRepo.findOne({
      where: { dealId: deal.id },
      order: { createdAt: 'DESC' },
    });
    const lastHistory = await this.historyRepo.findOne({
      where: { dealId: deal.id },
      order: { movedAt: 'DESC' },
    });
    const candidates = [
      formatDateISO(deal.updatedAt),
      lastNote ? formatDateISO(lastNote.createdAt) : null,
      lastHistory ? formatDateISO(lastHistory.movedAt) : null,
    ].filter((d): d is string => !!d);
    const ultimaActividad = candidates.sort().reverse()[0] ?? '';

    return {
      id: deal.id,
      lead: {
        id: deal.lead.id,
        nombre: deal.lead.nombre,
        email: deal.lead.email,
        telefono: deal.lead.telefono,
        provincia: deal.lead.provincia,
        ciudad: deal.lead.ciudad,
        tipo: deal.lead.tipo,
        notasGenerales: deal.lead.notasGenerales,
        createdAt: formatDateISO(deal.lead.createdAt) || '',
        updatedAt: formatDateISO(deal.lead.updatedAt) || '',
      },
      vendor: deal.vendor
        ? {
            id: deal.vendor.id,
            nombre: deal.vendor.nombre,
            activo: deal.vendor.activo,
            createdAt: formatDateISO(deal.vendor.createdAt) || '',
            updatedAt: formatDateISO(deal.vendor.updatedAt) || '',
          }
        : null,
      stage: {
        id: deal.stage.id,
        nombre: deal.stage.nombre,
        orden: deal.stage.orden,
        color: deal.stage.color,
        probability: deal.stage.probability,
        isTerminal: deal.stage.isTerminal,
      },
      currentReason: deal.currentReason
        ? { id: deal.currentReason.id, motivo: deal.currentReason.motivo }
        : null,
      monto: deal.monto,
      fechaCierre: deal.fechaCierre,
      ultimaActividad,
      createdAt: formatDateISO(deal.createdAt) || '',
      updatedAt: formatDateISO(deal.updatedAt) || '',
    };
  }

  private toNoteDto(note: DealNote): DealNoteResponseDto {
    return {
      id: note.id,
      dealId: note.dealId,
      contenido: note.contenido,
      createdAt: formatDateISO(note.createdAt) || '',
    };
  }
}
