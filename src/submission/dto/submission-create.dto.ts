import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SubmissionType } from '../submission.enum';

@ApiSchema({ name: 'SubmissionCreateDto' })
export class SubmissionCreateDto {
  @ApiProperty({ enum: SubmissionType, example: SubmissionType.MAYORISTA })
  @IsEnum(SubmissionType)
  tipo: SubmissionType;

  @ApiProperty({ example: 'Lubricentro San Martín' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MaxLength(180)
  nombre: string;

  @ApiProperty({ example: 'contacto@lubricentro.com' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no es válido' })
  @MaxLength(180)
  email: string;

  @ApiProperty({ required: false, example: '+54 9 11 5555-5555' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mensaje?: string;

  @ApiProperty({
    required: false,
    description:
      'Campos específicos del formulario. Las claves se filtran contra una whitelist por tipo.',
    example: { cuit: '30-12345678-9', afip: 'Responsable Inscripto' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  /**
   * Honeypot anti-bot. Debe declararse acá porque el ValidationPipe global usa
   * `forbidNonWhitelisted: true`: un campo no declarado haría fallar la request
   * con 400 y le revelaría al bot que el campo existe.
   *
   * Si llega con contenido, el service descarta la solicitud en silencio y
   * responde como si hubiera sido exitosa.
   */
  @ApiProperty({ required: false, description: 'No completar (anti-spam)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
