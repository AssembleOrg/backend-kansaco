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

@Entity('deal_note')
export class DealNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  dealId: number;

  @ManyToOne(() => Deal, (deal) => deal.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: Deal;

  @Column({ type: 'text', nullable: false })
  contenido: string;

  @Index()
  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;
}
