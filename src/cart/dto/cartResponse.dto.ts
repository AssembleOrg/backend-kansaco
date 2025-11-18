import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { CartItemResponse } from './cartItemResponse.dto';
import { IsArray, IsISO8601, IsNumber, IsString } from 'class-validator';

@ApiSchema({
  name: 'CartResponseDto',
})
export class CartResponse {
  @ApiProperty({
    description: 'Cart Id',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Cart Created At (ISO 8601 string in GMT-3)',
    type: String,
  })
  @IsISO8601()
  createdAt: string;

  @ApiProperty({
    description: 'Cart Updated At (ISO 8601 string in GMT-3)',
    type: String,
  })
  @IsISO8601()
  updatedAt: string;

  @ApiProperty({
    description: 'Cart User Id',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Cart Items',
  })
  @IsArray()
  items: CartItemResponse[];
}
