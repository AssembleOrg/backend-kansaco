import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity('discount')
export class Discount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
  })
  porcentaje: number;

  @ManyToMany(() => User, (user) => user.descuentosAplicados)
  clientes: User[];

  @ManyToMany(() => Product, (product) => product.discounts)
  productos: Product[];
}


