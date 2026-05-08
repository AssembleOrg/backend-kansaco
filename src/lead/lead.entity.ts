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
import { LeadType } from './lead.enum';

@Entity('lead')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 180, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  provincia: string | null;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  ciudad: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: LeadType,
    enumName: 'lead_type',
    default: LeadType.MAYORISTA,
  })
  tipo: LeadType;

  @Column({ type: 'text', nullable: true })
  notasGenerales: string | null;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
