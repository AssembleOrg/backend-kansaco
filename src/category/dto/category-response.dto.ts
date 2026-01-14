import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

@ApiSchema({ name: 'CategoryResponseDto' })
export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    type: Number,
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Category Name',
    type: String,
    example: 'Vehículos',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Category Creation Date (ISO string in GMT-3)',
    type: String,
    example: '2025-01-15T10:30:00-03:00',
  })
  @IsString()
  createdAt: string;

  @ApiProperty({
    description: 'Category Last Update Date (ISO string in GMT-3)',
    type: String,
    example: '2025-01-15T10:30:00-03:00',
  })
  @IsString()
  updatedAt: string;
}
