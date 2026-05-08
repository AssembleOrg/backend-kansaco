import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

@ApiSchema({ name: 'DealMoveStageDto' })
export class DealMoveStageDto {
  @ApiProperty({ description: 'ID de la etapa destino' })
  @IsInt()
  @Min(1)
  toStageId: number;

  @ApiPropertyOptional({
    description: 'ID del motivo (requerido si la etapa destino es terminal)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  reasonId?: number;
}
