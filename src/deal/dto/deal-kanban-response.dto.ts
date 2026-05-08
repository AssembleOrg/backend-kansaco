import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { TerminalKind } from '../../pipeline-stage/pipeline.enum';
import { DealResponseDto } from './deal-response.dto';

@ApiSchema({ name: 'DealKanbanColumnDto' })
export class DealKanbanColumnDto {
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

  @ApiProperty({ type: [DealResponseDto] })
  deals: DealResponseDto[];

  @ApiProperty()
  cantidad: number;

  @ApiProperty({ description: 'Suma de montos de la columna (string decimal)' })
  total: string;

  @ApiProperty({
    description: 'Total ponderado: total * probability/100 (string decimal)',
  })
  totalPonderado: string;
}

@ApiSchema({ name: 'DealKanbanResponseDto' })
export class DealKanbanResponseDto {
  @ApiProperty({ type: [DealKanbanColumnDto] })
  columns: DealKanbanColumnDto[];
}
