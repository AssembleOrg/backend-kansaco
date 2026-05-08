import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { LeadCreateDto } from './dto/lead-create.dto';
import { LeadUpdateDto } from './dto/lead-update.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { LeadType } from './lead.enum';
import { formatDateISO } from '../helpers/date.helper';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async findAll(filters: LeadFilterDto = {}): Promise<LeadResponseDto[]> {
    const qb = this.leadRepository.createQueryBuilder('lead');

    if (filters.search) {
      qb.andWhere(
        '(LOWER(lead.nombre) LIKE :s OR LOWER(lead.email) LIKE :s)',
        { s: `%${filters.search.toLowerCase()}%` },
      );
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

    qb.orderBy('lead.createdAt', 'DESC');
    const leads = await qb.getMany();
    return leads.map((l) => this.toResponseDto(l));
  }

  async findOne(id: number): Promise<LeadResponseDto> {
    const lead = await this.findEntity(id);
    return this.toResponseDto(lead);
  }

  async findEntity(id: number): Promise<Lead> {
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} no encontrado`);
    }
    return lead;
  }

  async create(dto: LeadCreateDto): Promise<LeadResponseDto> {
    const lead = this.leadRepository.create({
      nombre: dto.nombre.trim(),
      email: dto.email?.trim() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      provincia: dto.provincia?.trim() ?? null,
      ciudad: dto.ciudad?.trim() ?? null,
      tipo: dto.tipo ?? LeadType.MAYORISTA,
      notasGenerales: dto.notasGenerales?.trim() ?? null,
    });
    const saved = await this.leadRepository.save(lead);
    this.logger.log(`Lead creado: ${saved.nombre} (id=${saved.id})`);
    return this.toResponseDto(saved);
  }

  async update(id: number, dto: LeadUpdateDto): Promise<LeadResponseDto> {
    const lead = await this.findEntity(id);
    if (dto.nombre !== undefined) lead.nombre = dto.nombre.trim();
    if (dto.email !== undefined) lead.email = dto.email?.trim() || null;
    if (dto.telefono !== undefined) lead.telefono = dto.telefono?.trim() || null;
    if (dto.provincia !== undefined)
      lead.provincia = dto.provincia?.trim() || null;
    if (dto.ciudad !== undefined) lead.ciudad = dto.ciudad?.trim() || null;
    if (dto.tipo !== undefined) lead.tipo = dto.tipo;
    if (dto.notasGenerales !== undefined)
      lead.notasGenerales = dto.notasGenerales?.trim() || null;

    const saved = await this.leadRepository.save(lead);
    return this.toResponseDto(saved);
  }

  async delete(id: number): Promise<void> {
    const lead = await this.findEntity(id);
    await this.leadRepository.remove(lead);
    this.logger.log(`Lead eliminado: id=${id}`);
  }

  private toResponseDto(lead: Lead): LeadResponseDto {
    return {
      id: lead.id,
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono,
      provincia: lead.provincia,
      ciudad: lead.ciudad,
      tipo: lead.tipo,
      notasGenerales: lead.notasGenerales,
      createdAt: formatDateISO(lead.createdAt) || '',
      updatedAt: formatDateISO(lead.updatedAt) || '',
    };
  }
}
