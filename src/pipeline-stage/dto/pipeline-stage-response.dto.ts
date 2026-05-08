import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { TerminalKind } from '../pipeline.enum';

@ApiSchema({ name: 'TerminalReasonResponseDto' })
export class TerminalReasonResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  stageId: number;

  @ApiProperty()
  motivo: string;

  @ApiProperty()
  orden: number;
}

@ApiSchema({ name: 'PipelineStageResponseDto' })
export class PipelineStageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  orden: number;

  @ApiProperty()
  color: string;

  @ApiProperty()
  probability: number;

  @ApiProperty()
  isTerminal: boolean;

  @ApiProperty({ enum: TerminalKind, nullable: true })
  terminalKind: TerminalKind | null;

  @ApiProperty({ type: [TerminalReasonResponseDto] })
  reasons: TerminalReasonResponseDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
