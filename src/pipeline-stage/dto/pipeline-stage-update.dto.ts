import { PartialType } from '@nestjs/swagger';
import { PipelineStageCreateDto } from './pipeline-stage-create.dto';

export class PipelineStageUpdateDto extends PartialType(
  PipelineStageCreateDto,
) {}
