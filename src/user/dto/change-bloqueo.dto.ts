import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { UserBloqueo } from '../user.enum';

export class ChangeBloqueoDto {
  @ApiPropertyOptional({
    enum: UserBloqueo,
    nullable: true,
    description: 'Motivo del freno (COBRANZAS | VENTAS). null = destrabar.',
  })
  // `null` destraba; cualquier otro valor tiene que ser un motivo válido.
  @ValidateIf((dto: ChangeBloqueoDto) => dto.bloqueo !== null)
  @IsEnum(UserBloqueo)
  bloqueo: UserBloqueo | null;
}
