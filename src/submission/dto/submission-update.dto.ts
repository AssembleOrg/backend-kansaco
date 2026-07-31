import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'SubmissionUpdateDto' })
export class SubmissionUpdateDto {
  @ApiProperty({ required: false, description: 'Marcar como leída / no leída' })
  @IsOptional()
  @IsBoolean()
  leida?: boolean;

  @ApiProperty({ required: false, description: 'Notas internas del equipo' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notaInterna?: string;
}
