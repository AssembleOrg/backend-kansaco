import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Self-service profile update. Deliberately excludes `rol`: users cannot
 * change their own role. Changing email or password requires the current
 * password.
 */
export class UpdateProfileDto {
  @ApiProperty({ description: 'User Email', type: String, required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'New Password', type: String, required: false })
  @IsOptional()
  @MinLength(8, { message: 'Password should be at least 8 characters long' })
  password?: string;

  @ApiProperty({
    description: 'Current password (required to change email or password)',
    type: String,
    required: false,
  })
  @ValidateIf((o: UpdateProfileDto) => !!o.email || !!o.password)
  @IsNotEmpty({
    message: 'currentPassword is required to change email or password',
  })
  @IsString()
  currentPassword?: string;

  @ApiProperty({ description: 'User First Name', type: String, required: false })
  @IsOptional()
  @IsNotEmpty({ message: 'Nombre should not be empty' })
  @IsString()
  nombre?: string;

  @ApiProperty({ description: 'User Last Name', type: String, required: false })
  @IsOptional()
  @IsNotEmpty({ message: 'Apellido should not be empty' })
  @IsString()
  apellido?: string;

  @ApiProperty({ description: 'User Address', type: String, required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ description: 'User Phone', type: String, required: false })
  @IsOptional()
  @IsNotEmpty({ message: 'Telefono should not be empty' })
  @IsString()
  telefono?: string;
}
