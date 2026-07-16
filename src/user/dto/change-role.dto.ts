import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../user.enum';

export class ChangeRoleDto {
  @ApiProperty({ enum: UserRole, description: 'Nueva categoría/rol del usuario' })
  @IsEnum(UserRole)
  rol: UserRole;
}
