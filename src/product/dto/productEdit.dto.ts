import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Allow, IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'ProductoEditDto' })
export class ProductEdit {
  @ApiProperty({
    description: 'Product Name',
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    description: 'Product Category (can be repeated)',
  })
  @IsString({ each: true })
  @IsOptional()
  category: string[];

  @ApiProperty({
    description: 'Product SKU',
  })
  @IsString()
  @IsOptional()
  sku: string;

  @ApiProperty({
    description: 'Product Stock',
  })
  @IsNumber()
  @IsOptional()
  stock: number;

  @ApiProperty({
    description: 'Product WholeSaler',
  })
  @MaxLength(10000)
  @IsString()
  @IsOptional()
  wholeSaler: string;

  @ApiProperty({
    description: 'Product IsVisible',
  })
  @IsBoolean()
  @IsOptional()
  isVisible: boolean;

  @ApiProperty({
    description: 'Product IsFeatured',
  })
  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;

  @ApiProperty({
    description: 'Product Description',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    description: 'Product Presentation',
  })
  @IsString()
  @IsOptional()
  presentation: string;

  @ApiProperty({
    description: 'Product Application',
  })
  @IsString()
  @IsOptional()
  aplication: string;

  @ApiProperty({
    description: 'Product ImageUrl',
  })
  @IsString()
  @IsOptional()
  imageUrl: string;

  @ApiProperty({
    description: 'Product Price',
  })
  @IsNumber()
  @IsOptional()
  price: number;

  /**
   * Sólo lectura: viene en la respuesta y el panel la reenvía al editar. Se
   * acepta para no dar 400 y se descarta (la ficha va por su endpoint).
   */
  @Allow()
  @IsOptional()
  technicalSheet?: unknown;
}
