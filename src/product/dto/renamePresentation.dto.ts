import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RenamePresentationDto {
  @ApiProperty({ example: 'Balde 20 Litros', description: 'Texto actual de la presentación' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  from: string;

  @ApiProperty({ example: 'Balde 20 L', description: 'Nuevo texto (sin coma)' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255) // cart_item.presentation es varchar(255)
  @Matches(/^[^,]+$/, { message: 'La presentación no puede contener comas' })
  to: string;
}
