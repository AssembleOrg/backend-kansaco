import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../user/user.enum';

/**
 * Lista de precios por categoría de cliente.
 * Guarda un porcentaje de recargo (o descuento, si es negativo) que se aplica
 * sobre el precio base del producto para esa categoría.
 * precioFinal = round(base * (1 + percentage / 100), 2)
 */
@Entity('role_pricing')
export class RolePricing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    unique: true,
  })
  rol: UserRole;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  percentage: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
