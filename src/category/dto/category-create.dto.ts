import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'CategoryCreateDto' })
export class CategoryCreateDto {
  @ApiProperty({
    description: 'Category Name',
    example: 'Vehículos',
  })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  @MaxLength(120, { message: 'Category name must be at most 120 characters' })
  name: string;
}
