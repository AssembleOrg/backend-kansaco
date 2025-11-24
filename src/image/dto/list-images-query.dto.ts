import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListImagesQueryDto {
  @ApiProperty({
    description: 'Page number (starts at 1)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of images per page (max 1000)',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by prefix (folder path)',
    example: 'products/',
    required: false,
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({
    description: 'Continuation token for pagination (from previous response)',
    example: 'eyJDb250aW51YXRpb25Ub2tlbiI6ICI...',
    required: false,
  })
  @IsOptional()
  @IsString()
  continuationToken?: string;
}

