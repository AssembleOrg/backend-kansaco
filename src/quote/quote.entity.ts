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
import { Deal } from '../deal/deal.entity';
import { QuoteEstado } from './quote.enum';
import { QuoteItem } from './quote-item.entity';

@Entity('quote')
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  dealId: number;

  @ManyToOne(() => Deal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: Deal;

  @Column({ type: 'varchar', length: 40, nullable: false, unique: true })
  numero: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  titulo: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 21 })
  ivaPorcentaje: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  ivaMonto: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: string;

  @Index()
  @Column({
    type: 'enum',
    enum: QuoteEstado,
    enumName: 'quote_estado',
    default: QuoteEstado.BORRADOR,
  })
  estado: QuoteEstado;

  @Column({ type: 'date', nullable: true })
  validoHasta: string | null;

  @Column({ type: 'varchar', length: 120, default: 'Transferencia Bancaria' })
  formaPago: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @OneToMany(() => QuoteItem, (item) => item.quote, {
    cascade: ['insert', 'update'],
  })
  items: QuoteItem[];

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;

  @UpdateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  updatedAt: DateTime;
}
