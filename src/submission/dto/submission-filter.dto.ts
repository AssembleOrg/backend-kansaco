import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SubmissionType } from '../submission.enum';

@ApiSchema({ name: 'SubmissionFilterDto' })
export class SubmissionFilterDto {
  @ApiProperty({ required: false, description: 'Busca en nombre y email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: SubmissionType })
  @IsOptional()
  @IsEnum(SubmissionType)
  tipo?: SubmissionType;

  @ApiProperty({ required: false, description: 'true | false' })
  @IsOptional()
  // Los query params llegan como string; sin esto `@IsBoolean` rechazaría "false".
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  leida?: boolean;
}
