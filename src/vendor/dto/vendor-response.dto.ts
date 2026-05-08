import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'VendorResponseDto' })
export class VendorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  activo: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
