import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'User Password',
    type: String,
    required: false,
  })
  @IsOptional()
  @MinLength(8, { message: 'Password should be at least 8 characters long' })
  password?: string;
}



