import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';
import { Lead } from '../lead/lead.entity';
import { Vendor } from '../vendor/vendor.entity';
import { PipelineStage } from '../pipeline-stage/pipeline-stage.entity';
import { TerminalReason } from '../pipeline-stage/terminal-reason.entity';
import { DealStageHistory } from './deal-stage-history.entity';
import { DealNote } from './deal-note.entity';

@Entity('deal')
export class Deal {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Index()
  @Column({ type: 'integer', nullable: true })
  vendorId: number | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @Index()
  @Column({ type: 'integer', nullable: false })
  stageId: number;

  @ManyToOne(() => PipelineStage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stageId' })
  stage: PipelineStage;

  @Column({ type: 'integer', nullable: true })
  currentReasonId: number | null;

  @ManyToOne(() => TerminalReason, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'currentReasonId' })
  currentReason: TerminalReason | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  monto: string | null;

  @Index()
  @Column({ type: 'date', nullable: true })
  fechaCierre: string | null;

  @OneToMany(() => DealStageHistory, (h) => h.deal)
  history: DealStageHistory[];

  @OneToMany(() => DealNote, (n) => n.deal)
  notes: DealNote[];

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
