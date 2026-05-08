import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LeadType } from '../lead.enum';

@ApiSchema({ name: 'LeadCreateDto' })
export class LeadCreateDto {
  @ApiProperty({ description: 'Nombre del lead/cliente', example: 'MINERA AGUILAR' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(180)
  nombre: string;

  @ApiProperty({ required: false, example: 'contacto@aguilar.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @ApiProperty({ required: false, example: '+5491100000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiProperty({ required: false, example: 'Jujuy' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provincia?: string;

  @ApiProperty({ required: false, example: 'San Salvador' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ciudad?: string;

  @ApiProperty({ enum: LeadType, default: LeadType.MAYORISTA })
  @IsOptional()
  @IsEnum(LeadType)
  tipo?: LeadType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notasGenerales?: string;
}
