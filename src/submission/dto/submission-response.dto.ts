import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { SubmissionType } from '../submission.enum';

/**
 * Respuesta de los endpoints de administración.
 *
 * `ipHash` se omite deliberadamente: sólo sirve para forensia de abuso del
 * lado del servidor y no aporta nada al panel.
 */
@ApiSchema({ name: 'SubmissionResponseDto' })
export class SubmissionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: SubmissionType })
  tipo: SubmissionType;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  telefono: string | null;

  @ApiProperty({ nullable: true })
  mensaje: string | null;

  @ApiProperty({ type: Object })
  payload: Record<string, string>;

  @ApiProperty()
  leida: boolean;

  @ApiProperty({ nullable: true })
  leidaAt: string | null;

  @ApiProperty({ nullable: true })
  notaInterna: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

@ApiSchema({ name: 'SubmissionStatsDto' })
export class SubmissionStatsDto {
  @ApiProperty({ description: 'Cantidad de solicitudes sin leer' })
  noLeidas: number;
}
