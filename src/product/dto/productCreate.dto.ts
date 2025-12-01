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
  @IsNotEmpty()
  @MaxLength(120)
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
  @IsNotEmpty()
  @MaxLength(120)
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
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiProperty({
    description: 'Product Presentation',
  })
  @IsNotEmpty()
  @MaxLength(10000)
  presentation: string;

  @ApiProperty({
    description: 'Product Application',
  })
  @IsNotEmpty()
  @MaxLength(120)
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
