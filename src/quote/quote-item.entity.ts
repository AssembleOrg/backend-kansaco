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
import { Quote } from './quote.entity';
import { Product } from '../product/product.entity';

@Entity('quote_item')
export class QuoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'integer', nullable: false })
  quoteId: number;

  @ManyToOne(() => Quote, (quote) => quote.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteId' })
  quote: Quote;

  @Column({ type: 'integer', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  productName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  presentation: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: false })
  cantidad: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: false })
  precioUnitario: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: false })
  subtotal: string;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;
}
