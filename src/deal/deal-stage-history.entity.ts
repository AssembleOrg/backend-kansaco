import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';
import { Deal } from './deal.entity';
import { PipelineStage } from '../pipeline-stage/pipeline-stage.entity';
import { TerminalReason } from '../pipeline-stage/terminal-reason.entity';

@Entity('deal_stage_history')
export class DealStageHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  dealId: number;

  @ManyToOne(() => Deal, (deal) => deal.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: Deal;

  @Column({ type: 'integer', nullable: true })
  fromStageId: number | null;

  @ManyToOne(() => PipelineStage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fromStageId' })
  fromStage: PipelineStage | null;

  @Column({ type: 'integer', nullable: false })
  toStageId: number;

  @ManyToOne(() => PipelineStage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toStageId' })
  toStage: PipelineStage;

  @Column({ type: 'integer', nullable: true })
  reasonId: number | null;

  @ManyToOne(() => TerminalReason, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reasonId' })
  reason: TerminalReason | null;

  @Index()
  @CreateDateColumn({
    name: 'movedAt',
    type: 'timestamp',
    transformer: dateTransformer,
  })
  movedAt: DateTime;
}
