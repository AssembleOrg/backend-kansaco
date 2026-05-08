import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { LeadResponseDto } from '../../lead/dto/lead-response.dto';
import { VendorResponseDto } from '../../vendor/dto/vendor-response.dto';

@ApiSchema({ name: 'DealStageInfoDto' })
export class DealStageInfoDto {
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
}

@ApiSchema({ name: 'DealReasonInfoDto' })
export class DealReasonInfoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  motivo: string;
}

@ApiSchema({ name: 'DealNoteResponseDto' })
export class DealNoteResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  dealId: number;

  @ApiProperty()
  contenido: string;

  @ApiProperty()
  createdAt: string;
}

@ApiSchema({ name: 'DealStageHistoryResponseDto' })
export class DealStageHistoryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  fromStageId: number | null;

  @ApiProperty({ nullable: true })
  fromStageNombre: string | null;

  @ApiProperty()
  toStageId: number;

  @ApiProperty()
  toStageNombre: string;

  @ApiProperty({ nullable: true })
  reasonId: number | null;

  @ApiProperty({ nullable: true })
  reasonMotivo: string | null;

  @ApiProperty()
  movedAt: string;
}

@ApiSchema({ name: 'DealResponseDto' })
export class DealResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: LeadResponseDto })
  lead: LeadResponseDto;

  @ApiProperty({ type: VendorResponseDto, nullable: true })
  vendor: VendorResponseDto | null;

  @ApiProperty({ type: DealStageInfoDto })
  stage: DealStageInfoDto;

  @ApiProperty({ type: DealReasonInfoDto, nullable: true })
  currentReason: DealReasonInfoDto | null;

  @ApiProperty({ nullable: true })
  monto: string | null;

  @ApiProperty({ nullable: true })
  fechaCierre: string | null;

  @ApiProperty({ description: 'Última actividad: max(updatedAt, last note, last stage move)' })
  ultimaActividad: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

@ApiSchema({ name: 'DealDetailResponseDto' })
export class DealDetailResponseDto extends DealResponseDto {
  @ApiProperty({ type: [DealNoteResponseDto] })
  notes: DealNoteResponseDto[];

  @ApiProperty({ type: [DealStageHistoryResponseDto] })
  history: DealStageHistoryResponseDto[];
}
