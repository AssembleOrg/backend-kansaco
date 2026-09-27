import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';

/**
 * Bulto de venta con nombre (ej. "Caja x 24", "Pallet x 48").
 * La cantidad de pedidos/carrito sigue siendo en UNIDADES (lo que usa Tango);
 * el bulto es una equivalencia que sirve para mostrar y sugerir cantidades.
 */
@Entity('bulto')
export class Bulto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  nombre: string;

  @Column({ type: 'int' })
  unidades: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Asignación de un bulto a una presentación de un producto.
 * `presentation` es el texto exacto de una de las opciones de product.presentation
 * (mismo split/trim que usa el carrito). Una presentación puede tener varios bultos.
 */
@Entity('product_bulto')
@Unique('UQ_product_bulto', ['productId', 'presentation', 'bultoId'])
export class ProductBulto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'text' })
  presentation: string;

  @Column({ type: 'int' })
  bultoId: number;

  @ManyToOne(() => Bulto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bultoId' })
  bulto: Bulto;
}
