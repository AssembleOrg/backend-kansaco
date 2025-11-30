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
import { Product } from '../product/product.entity';

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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
        presentation: item.presentation || undefined,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
          description: item.product.description,
          imageUrl: item.product.imageUrl,
          slug: item.product.slug,
          sku: item.product.sku,
          presentation: item.product.presentation,
          aplication: item.product.aplication,
          stock: item.product.stock,
          wholeSaler: item.product.wholeSaler,
          isVisible: item.product.isVisible,
          isFeatured: item.product.isFeatured,
        } : null,
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
      relations: ['cart', 'cart.items', 'cart.items.product'],
    });
    if (!getUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    // Si el usuario ya tiene carrito, devolverlo en lugar de error
    if (getUser.cart) {
      return this.toCartResponse(getUser.cart);
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

  /**
   * Valida que la presentación existe en las opciones del producto
   */
  private validatePresentation(product: Product, presentation?: string): boolean {
    if (!presentation) {
      return true; // Presentación es opcional
    }

    if (!product.presentation) {
      return false; // El producto no tiene presentaciones definidas
    }

    // Dividir las presentaciones por coma y limpiar espacios
    const validPresentations = product.presentation
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Verificar que la presentación proporcionada existe (case-sensitive)
    return validPresentations.includes(presentation);
  }

  async addItemToCart(
    cartId: number,
    productId: number,
    quantity: number,
    presentation?: string,
  ): Promise<CartResponse> {
    // 1) Check the cart exists
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // 2) Check the product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // 3) Validate presentation if provided
    if (presentation) {
      const isValid = this.validatePresentation(product, presentation);
      if (!isValid) {
        throw new BadRequestException(
          `La presentación "${presentation}" no es válida para este producto. Presentaciones disponibles: ${product.presentation || 'Ninguna'}`,
        );
      }
    }

    // 4) Buscar item existente por producto + presentación
    // Normalizar: null y undefined se tratan igual para la búsqueda
    const presentationValue = presentation || null;
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cartId,
        productId,
        presentation: presentationValue,
      },
    });

    if (existingItem) {
      // 5) Item existe con la misma presentación → incrementar cantidad
      existingItem.quantity += quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      // 6) No existe item con producto + presentación → crear nuevo item
      const newItem = this.cartItemRepository.create({
        cart,
        product: { id: productId } as any,
        quantity,
        presentation: presentationValue,
      });
      await this.cartItemRepository.save(newItem);
    }

    // 7) Return the cart *with* its items populated
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
