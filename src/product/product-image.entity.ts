import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_image')
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product: Product;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 500,
  })
  imageUrl: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 500,
  })
  imageKey: string; // Key en Digital Ocean Spaces

  @Column({
    type: 'int',
    default: 0,
  })
  order: number; // Orden de visualización

  @Column({
    type: 'boolean',
    default: false,
  })
  isPrimary: boolean; // Imagen principal

  @CreateDateColumn()
  createdAt: Date;
}

