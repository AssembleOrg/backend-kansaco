import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@ApiSchema({ name: 'TerminalReasonCreateDto' })
export class TerminalReasonCreateDto {
  @ApiProperty({ example: 'Precio' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  motivo: string;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
