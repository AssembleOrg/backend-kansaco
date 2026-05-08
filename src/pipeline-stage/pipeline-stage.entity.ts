import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';
import { TerminalKind } from './pipeline.enum';
import { TerminalReason } from './terminal-reason.entity';

@Entity('pipeline_stage')
export class PipelineStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, nullable: false, unique: true })
  nombre: string;

  @Index()
  @Column({ type: 'integer', nullable: false })
  orden: number;

  @Column({ type: 'varchar', length: 20, default: '#64748b' })
  color: string;

  @Column({ type: 'integer', default: 0 })
  probability: number;

  @Column({ type: 'boolean', default: false })
  isTerminal: boolean;

  @Column({
    type: 'enum',
    enum: TerminalKind,
    enumName: 'terminal_kind',
    nullable: true,
  })
  terminalKind: TerminalKind | null;

  @OneToMany(() => TerminalReason, (reason) => reason.stage, {
    cascade: ['insert', 'update'],
  })
  reasons: TerminalReason[];

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
