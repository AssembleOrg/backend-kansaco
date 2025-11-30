import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

@ApiSchema({ name: 'ProductGetDto' })
export class ProductGet {
  @ApiProperty({
    description: 'Product Name',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    description: 'Product Name',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  slug: string;

  @ApiProperty({
    description: 'Product Category',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Category should not be empty' })
  category: string[] | string;

  @ApiProperty({
    description: 'Product SKU',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  sku: string;

  @ApiProperty({
    description: 'Product Stock',
    type: Number,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  stock: number;

  @ApiProperty({
    description: 'Product WholeSaler',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  wholeSaler: string;

  @ApiProperty({
    description: 'Product IsVisible',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty({
    description: 'Product IsFeatured',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isFeatured: boolean;
}
