import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}
