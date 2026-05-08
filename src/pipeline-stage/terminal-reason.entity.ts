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
import { PipelineStage } from './pipeline-stage.entity';

@Entity('terminal_reason')
export class TerminalReason {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  stageId: number;

  @ManyToOne(() => PipelineStage, (stage) => stage.reasons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stageId' })
  stage: PipelineStage;

  @Column({ type: 'varchar', length: 120, nullable: false })
  motivo: string;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
