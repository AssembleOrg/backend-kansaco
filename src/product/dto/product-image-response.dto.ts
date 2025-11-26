import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponse {
  @ApiProperty({
    description: 'Image ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  productId: number;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://kansaco-images.nyc3.digitaloceanspaces.com/imagen.webp',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Image key in Digital Ocean Spaces',
    example: 'imagen.webp',
  })
  imageKey: string;

  @ApiProperty({
    description: 'Display order',
    example: 0,
  })
  order: number;

  @ApiProperty({
    description: 'Is primary image',
    example: true,
  })
  isPrimary: boolean;

  @ApiProperty({
    description: 'Creation date (ISO string in GMT-3)',
    example: '2024-11-24T10:30:00.000-03:00',
  })
  createdAt: string; // Serializado como ISO string por DateSerializeInterceptor
}

