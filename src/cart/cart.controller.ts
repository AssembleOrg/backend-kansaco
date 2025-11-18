import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CartResponse } from './dto/cartResponse.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { CartCreate } from './dto/cartCreate.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/user/user.enum';

@Controller('cart')
export class CartController {
  protected logger = new Logger('CartController');
  constructor(private readonly cartService: CartService) {}

  @Get('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async getCart(@Param('id') id: number): Promise<CartResponse> {
    return this.cartService.getCartByOwnId(id);
  }

  @Get('/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async getCartByUserId(
    @Param('userId') userId: string,
  ): Promise<CartResponse> {
    return this.cartService.getCartByUserId(userId);
  }

  @Post('/create')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async createCart(
    @Body(ValidationPipe) body: CartCreate,
  ): Promise<CartResponse> {
    return this.cartService.createCart(body.userId);
  }

  @Put('/:cartId/add/product/:productId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async addItemToCart(
    @Param('cartId') cartId: number,
    @Param('productId') productId: number,
    @Query('quantity') quantity?: number,
  ): Promise<CartResponse> {
    return this.cartService.addItemToCart(cartId, productId, quantity ?? 1);
  }

  @Patch('/:cartId/delete/product/:productId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async deleteItemFromCart(
    @Param('cartId') cartId: number,
    @Param('productId') productId: number,
    @Query('quantity') quantity?: number,
  ): Promise<CartResponse> {
    return this.cartService.deleteItemFromCart(
      cartId,
      productId,
      quantity ?? 1,
    );
  }

  @Patch('/:id/empty')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CartResponse })
  async emptyCart(@Param('id') id: number): Promise<CartResponse> {
    return this.cartService.emptyCart(id);
  }
}
