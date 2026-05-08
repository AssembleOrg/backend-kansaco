import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { QuoteEstado } from '../quote.enum';

@ApiSchema({ name: 'QuoteItemResponseDto' })
export class QuoteItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  productId: number | null;

  @ApiProperty()
  productName: string;

  @ApiProperty({ nullable: true })
  presentation: string | null;

  @ApiProperty()
  cantidad: string;

  @ApiProperty()
  precioUnitario: string;

  @ApiProperty()
  subtotal: string;

  @ApiProperty()
  orden: number;
}

@ApiSchema({ name: 'QuoteResponseDto' })
export class QuoteResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  dealId: number;

  @ApiProperty()
  numero: string;

  @ApiProperty({ nullable: true })
  titulo: string | null;

  @ApiProperty()
  subtotal: string;

  @ApiProperty()
  ivaPorcentaje: string;

  @ApiProperty()
  ivaMonto: string;

  @ApiProperty()
  total: string;

  @ApiProperty({ enum: QuoteEstado })
  estado: QuoteEstado;

  @ApiProperty({ nullable: true })
  validoHasta: string | null;

  @ApiProperty()
  formaPago: string;

  @ApiProperty({ nullable: true })
  notas: string | null;

  @ApiProperty({ nullable: true })
  pdfUrl: string | null;

  @ApiProperty({ type: [QuoteItemResponseDto] })
  items: QuoteItemResponseDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
