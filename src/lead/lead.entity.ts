import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';
import { LeadType } from './lead.enum';
import { Vendor } from '../vendor/vendor.entity';

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

  @Index()
  @Column({ type: 'integer', nullable: true })
  vendorId: number | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
