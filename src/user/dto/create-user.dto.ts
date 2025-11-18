import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../user.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'User Email',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User Password',
    type: String,
  })
  @IsNotEmpty({ message: 'Password should not be empty' })
  @MinLength(8, { message: 'Password should be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'User First Name',
    type: String,
  })
  @IsNotEmpty({ message: 'Nombre should not be empty' })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'User Last Name',
    type: String,
  })
  @IsNotEmpty({ message: 'Apellido should not be empty' })
  @IsString()
  apellido: string;

  @ApiProperty({
    description: 'User Address',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({
    description: 'User Phone',
    type: String,
  })
  @IsNotEmpty({ message: 'Telefono should not be empty' })
  @IsString()
  telefono: string;

  @ApiProperty({
    description: 'User Role',
    enum: UserRole,
    default: UserRole.CLIENTE_MINORISTA,
  })
  @IsEnum(UserRole)
  @IsOptional()
  rol?: UserRole;
}


