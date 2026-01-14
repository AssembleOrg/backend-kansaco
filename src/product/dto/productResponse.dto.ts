import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';
import { ProductImageResponse } from './product-image-response.dto';
import { CategoryResponseDto } from '../../category/dto/category-response.dto';

@ApiSchema({ name: 'ProductResponseDto' })
export class ProductResponse {
  @ApiProperty({
    description: 'Product ID',
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Product Name',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Product Category (legacy array of strings for compatibility)',
    type: [String],
  })
  @IsArray()
  category: Array<string>;

  @ApiProperty({
    description: 'Product Categories (relation to Category entities)',
    type: [CategoryResponseDto],
    required: false,
  })
  @IsArray()
  categories?: CategoryResponseDto[];

  @ApiProperty({
    description: 'Product Price',
    type: Number,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Product Description',
    type: String,
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Product Image Url',
    type: String,
  })
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'Product Image Url',
    type: String,
  })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Product SKU',
    type: String,
  })
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Product Presentation',
    type: String,
  })
  @IsString()
  presentation: string;

  @ApiProperty({
    description: 'Product Application',
    type: String,
  })
  @IsString()
  aplication: string;

  @ApiProperty({
    description: 'Product Stock',
    type: Number,
  })
  @IsString()
  stock: number;

  @ApiProperty({
    description: 'Product WholeSaler',
    type: String,
  })
  @IsString()
  wholeSaler: string;

  @ApiProperty({
    description: 'Product IsVisible',
    type: Boolean,
  })
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty({
    description: 'Product IsFeatured',
    type: Boolean,
  })
  @IsBoolean()
  isFeatured: boolean;

  @ApiProperty({
    description: 'Product Images',
    type: [ProductImageResponse],
    required: false,
  })
  @IsArray()
  images?: ProductImageResponse[];
}
