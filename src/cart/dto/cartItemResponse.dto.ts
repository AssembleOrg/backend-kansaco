import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
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
    description: 'Product presentation (e.g., "Balde 20 Litros", "Bidón 1 Litro")',
    example: 'Balde 20 Litros',
  })
  @IsOptional()
  @IsString()
  presentation?: string;

  @ApiPropertyOptional({
    description: 'Product details',
    type: ProductResponse,
  })
  @IsOptional()
  product?: ProductResponse | null;
}
