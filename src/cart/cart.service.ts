import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { Repository } from 'typeorm';
import { CartItem } from './cartItem.entity';
import { User } from 'src/user/user.entity';
import { nowAsDate, formatDateISO } from 'src/helpers/date.helper';
import { CartResponse } from './dto/cartResponse.dto';

@Injectable()
export class CartService {
  protected logger = new Logger('CartService');

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private toCartResponse(cart: Cart): CartResponse {
    return {
      id: cart.id,
      createdAt: formatDateISO(cart.createdAt),
      updatedAt: formatDateISO(cart.updatedAt),
      userId: cart.userId,
      items: (cart.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        cartId: item.cartId,
      })),
    };
  }

  async getCartByOwnId(id: number): Promise<CartResponse> {
    const cart = await this.cartRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!cart) {
      throw new NotFoundException(`Cart ${id} not found`);
    }
    return this.toCartResponse(cart);
  }

  async getCartByUserId(userId: string): Promise<CartResponse> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });
    if (!cart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }
    return this.toCartResponse(cart);
  }

  async createCart(userId: string): Promise<CartResponse> {
    const getUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['cart'],
    });
    if (!getUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (getUser.cart) {
      throw new BadRequestException(`User ${userId} already has a cart`);
    }
    const now = nowAsDate();
    const cart = this.cartRepository.create({
      userId,
      createdAt: now,
      updatedAt: now,
      items: [],
    });
    const savedCart = await this.cartRepository.save(cart);
    return this.toCartResponse(savedCart);
  }

  async addItemToCart(
    cartId: number,
    productId: number,
    quantity: number,
  ): Promise<CartResponse> {
    // 1) Check the cart exists
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // 2) Try to increment an existing row
    const updateResult = await this.cartItemRepository
      .createQueryBuilder()
      .update(CartItem)
      .set({ quantity: () => `"quantity" + ${quantity}` })
      .where('cartId = :cartId AND productId = :productId', {
        cartId,
        productId,
      })
      .execute();

    if (updateResult.affected === 0) {
      // 3) No existing item → insert a new one
      const newItem = this.cartItemRepository.create({
        cart,
        product: { id: productId } as any,
        quantity,
      });
      await this.cartItemRepository.save(newItem);
    }

    // 4) Return the cart *with* its items populated
    const updatedCart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });
    if (!updatedCart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }
    return this.toCartResponse(updatedCart);
  }

  async deleteItemFromCart(
    cartId: number,
    productId: number,
    quantity: number,
  ): Promise<CartResponse> {
    // 1) Check the cart exists
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // 2) Try to decrement an existing row
    const updateResult = await this.cartItemRepository
      .createQueryBuilder()
      .update(CartItem)
      .set({ quantity: () => `"quantity" - ${quantity}` })
      .where('cartId = :cartId AND productId = :productId', {
        cartId,
        productId,
      })
      .execute();

    if (updateResult.affected === 0) {
      // 3) No existing item → throw an error
      throw new BadRequestException(
        `Cart ${cartId} does not contain item ${productId}`,
      );
    }

    // 4) Return the cart *with* its items populated
    const updatedCart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });
    if (!updatedCart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }
    return this.toCartResponse(updatedCart);
  }

  async emptyCart(cartId: number): Promise<CartResponse> {
    // 1) Check the cart exists
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // 2) Delete all items
    await this.cartItemRepository.delete({ cartId });

    // 3) Return the cart *with* its items populated
    const emptyCart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });
    if (!emptyCart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }
    return this.toCartResponse(emptyCart);
  }
}
