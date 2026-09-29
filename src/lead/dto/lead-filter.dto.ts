import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LeadType } from '../lead.enum';

@ApiSchema({ name: 'LeadFilterDto' })
export class LeadFilterDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre / email' })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ description: 'ID del vendedor; 0 = sin asignar' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vendorId?: number;
}
