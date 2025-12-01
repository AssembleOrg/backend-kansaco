import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
