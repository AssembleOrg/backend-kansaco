import { CartItem } from '../cart/cartItem.entity';
import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Discount } from '../discount/discount.entity';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
  })
  name: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
    default: '',
  })
  slug: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
    default: '',
  })
  sku: string;

  @Column({
    type: 'text',
    nullable: false,
    array: true,
  })
  category: Array<string>;

  @Column({
    type: 'text',
    nullable: false,
  })
  description: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
  })
  presentation: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 90,
  })
  aplication: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 200,
  })
  imageUrl: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 100,
  })
  wholeSaler: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
  })
  stock: number;

  @Column({
    type: 'boolean',
    default: true,
  })
  isVisible: boolean;

  @Column({
    type: 'numeric',
    nullable: false,
    precision: 15,
    scale: 2,
    default: 0,
  })
  price: number;

  @OneToMany(() => CartItem, (item) => item.product)
  cartItems: CartItem[];

  @ManyToMany(() => Discount, (discount) => discount.productos)
  discounts: Discount[];
}
