import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from './order.enum';
import { CustomerType } from '../email/dto/send-order-email.dto';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';

// Interfaces para los campos JSONB
export interface OrderContactInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export interface OrderBusinessInfo {
  cuit: string;
  razonSocial?: string;
  situacionAfip: string;
  codigoPostal?: string;
}

export interface OrderItemData {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice?: number;
  presentation?: string;
}

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CustomerType,
    enumName: 'customer_type',
  })
  customerType: CustomerType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.PENDIENTE,
  })
  status: OrderStatus;

  @Column({ type: 'jsonb' })
  contactInfo: OrderContactInfo;

  @Column({ type: 'jsonb', nullable: true })
  businessInfo?: OrderBusinessInfo;

  @Column({ type: 'jsonb' })
  items: OrderItemData[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({
    type: 'timestamp',
    transformer: dateTransformer,
  })
  createdAt: DateTime;

  @UpdateDateColumn({
    type: 'timestamp',
    transformer: dateTransformer,
  })
  updatedAt: DateTime;
}
