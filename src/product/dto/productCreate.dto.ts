import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

@ApiSchema({ name: 'ProductCreateDto' })
export class ProductCreate {
  @ApiProperty({
    description: 'Product Name',
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Product Category (can be repeated)',
  })
  @IsNotEmpty()
  @IsString({ each: true })
  category: string[];

  @ApiProperty({
    description: 'Product SKU',
  })
  // Opcional: el formulario manda '' cuando no se carga (la columna tiene default '').
  @IsString()
  @MaxLength(120, { message: 'El SKU no puede superar los 120 caracteres' })
  @IsOptional()
  sku: string;

  @ApiProperty({
    description: 'Product Stock',
  })
  @IsNotEmpty()
  stock: number;

  @ApiProperty({
    description: 'Product WholeSaler',
  })
  @MaxLength(10000)
  @IsOptional()
  wholeSaler: string;

  @ApiProperty({
    description: 'Product IsVisible',
  })
  @IsNotEmpty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty({
    description: 'Product IsFeatured',
  })
  @IsNotEmpty()
  @IsBoolean()
  isFeatured: boolean;

  @ApiProperty({
    description: 'Product Description',
  })
  @IsString()
  @MaxLength(10000, { message: 'La descripción no puede superar los 10000 caracteres' })
  @IsOptional()
  description: string;

  @ApiProperty({
    description: 'Product Presentation',
  })
  @IsString()
  @MaxLength(10000, { message: 'La presentación no puede superar los 10000 caracteres' })
  @IsOptional()
  presentation: string;

  @ApiProperty({
    description: 'Product Application',
  })
  // La columna es varchar(90): con 120 pasaba la validación y fallaba el INSERT.
  @IsString()
  @MaxLength(90, { message: 'La aplicación no puede superar los 90 caracteres' })
  @IsOptional()
  aplication: string;

  @ApiProperty({
    description: 'Product ImageUrl',
  })
  @MaxLength(250)
  @IsOptional()
  imageUrl: string;

  @ApiProperty({
    description: 'Product Price',
  })
  @IsNotEmpty()
  price: number;
}
