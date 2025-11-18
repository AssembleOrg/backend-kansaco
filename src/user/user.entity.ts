import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from './user.enum';
import { Cart } from '../cart/cart.entity';
import { Discount } from '../discount/discount.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: true,
    length: 120,
  })
  email: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
  })
  nombre: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 120,
  })
  apellido: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
  })
  direccion: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 20,
  })
  telefono: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 255,
  })
  password: string;

  @Column({
    type: 'enum',
    nullable: false,
    enum: UserRole,
    enumName: 'user_role',
  })
  rol: UserRole;

  @ManyToMany(() => Discount, (discount) => discount.clientes)
  @JoinTable({
    name: 'user_discount',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'discountId', referencedColumnName: 'id' },
  })
  descuentosAplicados: Discount[];

  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart;
}
