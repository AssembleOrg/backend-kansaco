import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@ApiSchema({ name: 'VendorCreateDto' })
export class VendorCreateDto {
  @ApiProperty({ example: 'Diego' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
