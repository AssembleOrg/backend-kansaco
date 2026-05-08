import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

@ApiSchema({ name: 'DealCreateDto' })
export class DealCreateDto {
  @ApiProperty({ description: 'ID del lead asociado' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  leadId: number;

  @ApiPropertyOptional({ description: 'ID del vendedor asignado' })
  @IsOptional()
  @IsInt()
  @Min(1)
  vendorId?: number;

  @ApiPropertyOptional({
    description: 'ID de etapa inicial. Si no se especifica, se usa la primera no terminal',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  stageId?: number;

  @ApiPropertyOptional({
    description: 'Monto estimado (string decimal)',
    example: '1500000.00',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  monto?: string;

  @ApiPropertyOptional({ description: 'Fecha estimada de cierre (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaCierre?: string;
}
