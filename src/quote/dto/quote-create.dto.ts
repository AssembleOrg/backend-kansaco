import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuoteItemInputDto } from './quote-item-input.dto';

@ApiSchema({ name: 'QuoteCreateDto' })
export class QuoteCreateDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  dealId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ default: '21', description: 'Porcentaje IVA' })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  ivaPorcentaje?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validoHasta?: string;

  @ApiPropertyOptional({ default: 'Transferencia Bancaria' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  formaPago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [QuoteItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items: QuoteItemInputDto[];
}
