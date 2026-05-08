import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LeadType } from '../../lead/lead.enum';

@ApiSchema({ name: 'DealFilterDto' })
export class DealFilterDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre del lead' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vendorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageId?: number;

  @ApiPropertyOptional({ enum: LeadType })
  @IsOptional()
  @IsEnum(LeadType)
  tipo?: LeadType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({ description: 'Cierre desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Cierre hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    description: 'Incluir deals en stages terminales',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeTerminal?: boolean;
}
