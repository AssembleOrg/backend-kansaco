import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';
import { SubmissionType } from './submission.enum';

/**
 * Solicitud enviada desde un formulario público del sitio.
 *
 * Bandeja de entrada del sitio web: es intencionalmente independiente del CRM
 * (`lead`/`deal`), porque acá entra tráfico anónimo sin verificar y porque
 * "Trabajá con nosotros" y "Lubri Experto" no son prospectos comerciales.
 */
@Entity('contact_submission')
export class ContactSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    type: 'enum',
    enum: SubmissionType,
    enumName: 'submission_type',
  })
  tipo: SubmissionType;

  @Column({ type: 'varchar', length: 180, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 180, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  /** Mensaje libre del visitante (carta de presentación, consulta técnica, etc.). */
  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  /**
   * Campos específicos del formulario de origen. Las claves se filtran contra
   * una whitelist por tipo en el service (ver `payload-schemas.ts`); nunca se
   * persiste input crudo del cliente.
   */
  @Column({ type: 'jsonb', nullable: false, default: () => "'{}'::jsonb" })
  payload: Record<string, string>;

  @Index()
  @Column({ type: 'boolean', nullable: false, default: false })
  leida: boolean;

  @Column({ type: 'timestamp', nullable: true, transformer: dateTransformer })
  leidaAt: DateTime | null;

  /** Notas del equipo. Privada: nunca se expone en respuestas públicas. */
  @Column({ type: 'text', nullable: true })
  notaInterna: string | null;

  /** sha256(ip + salt). Permite rastrear abuso sin almacenar la IP en claro. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
