import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { ProductResponse } from '../../product/dto/productResponse.dto';

@ApiSchema({
  name: 'CartItemResponseDto',
})
export class CartItemResponse {
  @ApiProperty({
    description: 'Cart Item id',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Cart Item Product id',
  })
  @IsNumber()
  productId: number;

  @ApiProperty({
    description: 'Cart Item Quantity',
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Cart Id',
  })
  @IsNumber()
  cartId: number;

  @ApiPropertyOptional({
    description: 'Product details',
    type: ProductResponse,
  })
  @IsOptional()
  product?: ProductResponse | null;
}
