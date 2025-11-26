// cart-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../product/product.entity';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cartId: number;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cartId', referencedColumnName: 'id' })
  cart: Cart;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.cartItems, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product: Product;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  presentation?: string;
}
