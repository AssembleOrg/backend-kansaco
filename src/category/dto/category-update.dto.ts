import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'CategoryUpdateDto' })
export class CategoryUpdateDto {
  @ApiProperty({
    description: 'Category Name',
    example: 'Vehículos',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Category name must be at most 120 characters' })
  name?: string;
}
