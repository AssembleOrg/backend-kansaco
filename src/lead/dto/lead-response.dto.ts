import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { LeadType } from '../lead.enum';

@ApiSchema({ name: 'LeadResponseDto' })
export class LeadResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  telefono: string | null;

  @ApiProperty({ nullable: true })
  provincia: string | null;

  @ApiProperty({ nullable: true })
  ciudad: string | null;

  @ApiProperty({ enum: LeadType })
  tipo: LeadType;

  @ApiProperty({ nullable: true })
  notasGenerales: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
