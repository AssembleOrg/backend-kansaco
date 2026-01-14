import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';
import { dateTransformer } from '../database/date.transformer';
import { DateTime } from 'luxon';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
    unique: true,
  })
  name: string;

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

  @ManyToMany(() => Product, (product) => product.categories)
  @JoinTable({
    name: 'product_category',
    joinColumn: { name: 'categoryId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'productId', referencedColumnName: 'id' },
  })
  products: Product[];
}
