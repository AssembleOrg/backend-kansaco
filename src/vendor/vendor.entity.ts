import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';

@Entity('vendor')
export class Vendor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, nullable: false, unique: true })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
