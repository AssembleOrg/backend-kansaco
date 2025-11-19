import { User } from '../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
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

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.cart)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: ['insert', 'update', 'remove'],
    eager: true,
    orphanedRowAction: 'delete',
  })
  items: CartItem[];
}
