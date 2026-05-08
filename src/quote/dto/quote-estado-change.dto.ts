import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { QuoteEstado } from '../quote.enum';

@ApiSchema({ name: 'QuoteEstadoChangeDto' })
export class QuoteEstadoChangeDto {
  @ApiProperty({ enum: QuoteEstado })
  @IsEnum(QuoteEstado)
  estado: QuoteEstado;
}
