import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TerminalKind } from '../pipeline.enum';

@ApiSchema({ name: 'PipelineStageCreateDto' })
export class PipelineStageCreateDto {
  @ApiProperty({ example: 'Prospecto' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ description: 'Posición de la columna en el tablero', example: 1 })
  @IsInt()
  @Min(1)
  orden: number;

  @ApiProperty({ default: '#64748b', required: false, description: 'Color hex' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'color debe ser un hex válido (#rgb o #rrggbb)',
  })
  color?: string;

  @ApiProperty({ description: 'Probabilidad ponderada (0-100)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @ApiProperty({ enum: TerminalKind, required: false, nullable: true })
  @ValidateIf((o) => o.isTerminal === true)
  @IsEnum(TerminalKind, {
    message: 'terminalKind requerido cuando isTerminal=true',
  })
  terminalKind?: TerminalKind | null;
}
