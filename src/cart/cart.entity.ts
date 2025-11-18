import { User } from '../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { CartItem } from './cartItem.entity';
import { dateTransformer } from '../database/date.transformer';
import { DateTime } from 'luxon';

@Entity('cart')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'timestamp',
    nullable: false,
    transformer: dateTransformer,
  })
  createdAt: DateTime;

  @UpdateDateColumn({
    transformer: dateTransformer,
  })
  updatedAt: DateTime;

  @OneToOne(() => User, (user) => user.cart)
  @JoinColumn({ name: 'userId' })
  user: User;

  @RelationId((cart: Cart) => cart.user)
  userId: string;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: ['insert', 'update', 'remove'],
    eager: true,
    orphanedRowAction: 'delete',
  })
  items: CartItem[];
}
