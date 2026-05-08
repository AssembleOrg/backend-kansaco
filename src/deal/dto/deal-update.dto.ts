import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

@ApiSchema({ name: 'DealUpdateDto' })
export class DealUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  vendorId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  monto?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaCierre?: string | null;
}
