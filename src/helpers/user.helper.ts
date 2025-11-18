import { BadRequestException } from '@nestjs/common';
import { isEmail } from 'class-validator';

export function validateUser(
  email: string,
  password: string,
  nombre: string,
  apellido: string,
) {
  if (!isEmail(email)) throw new BadRequestException('Email is not valid');

  if (password.length < 8)
    throw new BadRequestException('Password is too short');

  if (nombre.trim().length < 2)
    throw new BadRequestException('Nombre is too short');

  if (apellido.trim().length < 2)
    throw new BadRequestException('Apellido is too short');
}
