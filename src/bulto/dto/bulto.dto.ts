import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBultoDto {
  @ApiProperty({ example: 'Caja x 24' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @ApiProperty({ example: 24, description: 'Unidades que trae el bulto' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  unidades: number;
}

export class UpdateBultoDto extends PartialType(CreateBultoDto) {}

export class BultoItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  productId: number;

  @ApiProperty({ example: 'Bidón 1 Litro' })
  @IsString()
  @IsNotEmpty()
  presentation: string;
}

export class AssignBultoDto {
  @ApiProperty({ type: [BultoItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BultoItemDto)
  items: BultoItemDto[];

  @ApiPropertyOptional({
    description: 'true (default) = solo previsualiza, no escribe nada',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
