import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

@ApiSchema({ name: 'PipelineStageReorderDto' })
export class PipelineStageReorderDto {
  @ApiProperty({
    description: 'IDs de stages en el orden deseado (posición 1..n)',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  stageIds: number[];
}
