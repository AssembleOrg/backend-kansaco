import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

@ApiSchema({ name: 'QuoteItemInputDto' })
export class QuoteItemInputDto {
  @ApiPropertyOptional({
    description: 'ID del producto del catálogo. Si null, se usa productName libre',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    description: 'Nombre del producto (snapshot u override). Requerido si no hay productId',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  presentation?: string;

  @ApiProperty({ example: '10' })
  @IsNumberString({ no_symbols: false })
  cantidad: string;

  @ApiPropertyOptional({
    description: 'Si no se especifica y hay productId, se toma del catálogo',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  precioUnitario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
