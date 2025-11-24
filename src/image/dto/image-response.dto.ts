import { ApiProperty } from '@nestjs/swagger';

export class ImageResponse {
  @ApiProperty({
    description: 'Image key (filename)',
    example: 'product-123.jpg',
  })
  key: string;

  @ApiProperty({
    description: 'Public URL of the image',
    example: 'https://kansaco-images.nyc3.digitaloceanspaces.com/product-123.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Last modified date',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  lastModified?: Date;

  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
    required: false,
  })
  size?: number;
}

export class PaginatedImageResponse {
  @ApiProperty({
    description: 'List of images',
    type: [ImageResponse],
  })
  images: ImageResponse[];

  @ApiProperty({
    description: 'Total number of images',
    example: 500,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of images per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Whether there are more pages',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Continuation token for next page (if hasMore is true)',
    example: 'eyJDb250aW51YXRpb25Ub2tlbiI6ICI...',
    required: false,
  })
  nextToken?: string;
}

