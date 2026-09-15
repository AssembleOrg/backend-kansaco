import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ContactSubmission } from './submission.entity';
import { SubmissionType } from './submission.enum';
import { SubmissionCreateDto } from './dto/submission-create.dto';
import { SubmissionFilterDto } from './dto/submission-filter.dto';
import { SubmissionUpdateDto } from './dto/submission-update.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import {
  PAYLOAD_ENUMS,
  PAYLOAD_KEYS,
  PAYLOAD_MAX_LENGTH,
  PAYLOAD_REQUIRED,
} from './payload-schemas';
import { formatDateISO } from '../helpers/date.helper';
import { now } from '../helpers/date.helper';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(ContactSubmission)
    private readonly submissionRepository: Repository<ContactSubmission>,
  ) {}

  /**
   * Alta desde un formulario público.
   *
   * Devuelve `null` cuando la solicitud se descarta por el honeypot: el
   * controller responde igual que en un alta exitosa para no darle señal al bot.
   */
  async createPublic(
    dto: SubmissionCreateDto,
    ip?: string,
  ): Promise<ContactSubmission | null> {
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn(
        `Solicitud descartada por honeypot (tipo=${dto.tipo}, email=${dto.email})`,
      );
      return null;
    }

    const payload = this.sanitizePayload(dto.tipo, dto.payload);

    const submission = this.submissionRepository.create({
      tipo: dto.tipo,
      nombre: dto.nombre.trim(),
      email: dto.email.trim().toLowerCase(),
      telefono: dto.telefono?.trim() || null,
      mensaje: dto.mensaje?.trim() || null,
      payload,
      leida: false,
      leidaAt: null,
      notaInterna: null,
      ipHash: this.hashIp(ip),
    });

    const saved = await this.submissionRepository.save(submission);
    this.logger.log(
      `Nueva solicitud ${saved.tipo} #${saved.id} de ${saved.nombre}`,
    );
    return saved;
  }

  async findAll(
    filters: SubmissionFilterDto = {},
  ): Promise<SubmissionResponseDto[]> {
    const qb = this.submissionRepository.createQueryBuilder('s');

    if (filters.search) {
      qb.andWhere('(LOWER(s.nombre) LIKE :q OR LOWER(s.email) LIKE :q)', {
        q: `%${filters.search.toLowerCase()}%`,
      });
    }
    if (filters.tipo) {
      qb.andWhere('s.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.leida !== undefined) {
      qb.andWhere('s.leida = :leida', { leida: filters.leida });
    }

    qb.orderBy('s.createdAt', 'DESC');
    const rows = await qb.getMany();
    return rows.map((r) => this.toResponseDto(r));
  }

  async findOne(id: number): Promise<SubmissionResponseDto> {
    return this.toResponseDto(await this.findEntity(id));
  }

  async update(
    id: number,
    dto: SubmissionUpdateDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.findEntity(id);

    if (dto.leida !== undefined && dto.leida !== submission.leida) {
      submission.leida = dto.leida;
      submission.leidaAt = dto.leida ? now() : null;
    }
    if (dto.notaInterna !== undefined) {
      submission.notaInterna = dto.notaInterna.trim() || null;
    }

    const saved = await this.submissionRepository.save(submission);
    return this.toResponseDto(saved);
  }

  async countNoLeidas(): Promise<number> {
    return this.submissionRepository.count({ where: { leida: false } });
  }

  async delete(id: number): Promise<void> {
    const submission = await this.findEntity(id);
    await this.submissionRepository.remove(submission);
    this.logger.log(`Solicitud eliminada: id=${id}`);
  }

  private async findEntity(id: number): Promise<ContactSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }
    return submission;
  }

  /**
   * Copia sólo las claves declaradas para el tipo. Nunca hace spread del input:
   * las claves desconocidas se descartan silenciosamente, así que ni una request
   * maliciosa ni un formulario desactualizado pueden inflar el jsonb.
   */
  private sanitizePayload(
    tipo: SubmissionType,
    raw: Record<string, unknown> | undefined,
  ): Record<string, string> {
    const allowed = PAYLOAD_KEYS[tipo] ?? [];
    const result: Record<string, string> = {};

    for (const key of allowed) {
      const value = raw?.[key];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'string') {
        throw new BadRequestException(`El campo "${key}" debe ser texto`);
      }

      const trimmed = value.trim();
      if (!trimmed) continue;

      if (trimmed.length > PAYLOAD_MAX_LENGTH) {
        throw new BadRequestException(
          `El campo "${key}" supera los ${PAYLOAD_MAX_LENGTH} caracteres`,
        );
      }

      const options = PAYLOAD_ENUMS[key];
      if (options && !options.includes(trimmed)) {
        throw new BadRequestException(`El valor de "${key}" no es válido`);
      }

      result[key] = trimmed;
    }

    for (const key of PAYLOAD_REQUIRED[tipo] ?? []) {
      if (!result[key]) {
        throw new BadRequestException(`El campo "${key}" es obligatorio`);
      }
    }

    return result;
  }

  /** Hash con sal para poder detectar abuso sin guardar la IP en claro. */
  private hashIp(ip?: string): string | null {
    if (!ip) return null;
    const salt = process.env.SUBMISSION_IP_SALT || 'kansaco-submission';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }

  private toResponseDto(s: ContactSubmission): SubmissionResponseDto {
    return {
      id: s.id,
      tipo: s.tipo,
      nombre: s.nombre,
      email: s.email,
      telefono: s.telefono,
      mensaje: s.mensaje,
      payload: s.payload ?? {},
      leida: s.leida,
      leidaAt: formatDateISO(s.leidaAt),
      notaInterna: s.notaInterna,
      createdAt: formatDateISO(s.createdAt) || '',
      updatedAt: formatDateISO(s.updatedAt) || '',
    };
  }
}
