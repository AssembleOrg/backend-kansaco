import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { QuoteItemInputDto } from './quote-item-input.dto';

@ApiSchema({ name: 'QuoteUpdateDto' })
export class QuoteUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  ivaPorcentaje?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validoHasta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  formaPago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({
    description: 'Si se envía, REEMPLAZA todos los items existentes',
    type: [QuoteItemInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items?: QuoteItemInputDto[];
}
