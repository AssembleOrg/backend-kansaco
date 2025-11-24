import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssociateImageDto {
  @ApiProperty({
    description: 'Image key in Digital Ocean Spaces',
    example: 'aceite-sintetico-p-ref-iso-68-gas-eco-134-x-1-lt.webp',
  })
  @IsNotEmpty()
  @IsString()
  imageKey: string;
}

