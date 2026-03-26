import {
  Column,
  CreateDateColumn,
  Entity,
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
  products: Product[];
}
