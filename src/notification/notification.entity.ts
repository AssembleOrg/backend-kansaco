import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DateTime } from 'luxon';
import { dateTransformer } from '../database/date.transformer';

/**
 * Qué originó el aviso. varchar (no enum de Postgres): sumar un tipo no pide
 * migración. PROMO está reservado para promociones por categoría
 * (ver NotificationService.notifyRole); todavía no hay pantalla que las cree.
 */
export type NotificationTipo = 'PEDIDO_ESTADO' | 'PEDIDO_EDITADO' | 'PROMO';

/** Aviso para un usuario (campanita del sitio). Una fila por destinatario. */
@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  tipo: NotificationTipo;

  @Column({ type: 'varchar', length: 160 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  /** Pedido al que refiere el aviso, si corresponde. */
  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  /** null = sin leer. */
  @Column({ type: 'timestamp', nullable: true, transformer: dateTransformer })
  leidaAt: DateTime | null;

  @CreateDateColumn({ type: 'timestamp', transformer: dateTransformer })
  createdAt: DateTime;
}
