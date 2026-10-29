import { CartItem } from '../cart/cartItem.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Discount } from '../discount/discount.entity';
import { ProductImage } from './product-image.entity';
import { Category } from '../category/category.entity';

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
    type: 'text',
    nullable: false,
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
    length: 250,
  })
  imageUrl: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  wholeSaler: string;

  /**
   * Ficha técnica (PDF). Se guarda en el bucket con ACL privada y sólo se sirve
   * por GET /product/:id/technical-sheet a usuarios logueados. El key no se
   * selecciona por defecto para que no viaje en las respuestas (productos,
   * carrito, etc.).
   */
  @Column({
    type: 'varchar',
    nullable: true,
    length: 250,
    select: false,
  })
  technicalSheetKey: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 200,
  })
  technicalSheetName: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  technicalSheetSize: number | null;

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
    type: 'boolean',
    default: false,
  })
  isFeatured: boolean;

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

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
    eager: false,
  })
  images: ProductImage[];

  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_category',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];
}
