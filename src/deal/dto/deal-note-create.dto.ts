import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'DealNoteCreateDto' })
export class DealNoteCreateDto {
  @ApiProperty({ description: 'Contenido de la nota' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  contenido: string;
}
