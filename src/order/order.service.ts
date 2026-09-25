import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.enum';
import { OrderItemDto, SendOrderEmailDto } from '../email/dto/send-order-email.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { esCategoriaB2B, UserRole } from '../user/user.enum';
import { OrderItemData } from './order.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { PricingService } from '../pricing/pricing.service';
import { BultoService } from '../bulto/bulto.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly pricingService: PricingService,
    private readonly bultoService: BultoService,
  ) {}

  async create(userId: string, orderData: SendOrderEmailDto): Promise<Order> {
    const order = this.orderRepository.create({
      userId,
      customerType: orderData.customerType,
      status: OrderStatus.PENDIENTE,
      contactInfo: orderData.contactInfo,
      businessInfo: orderData.businessInfo,
      shippingInfo: orderData.shippingInfo,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      notes: orderData.notes,
    });

    return this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserIdPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    return this.orderRepository.save(order);
  }

  async update(
    id: string,
    updateData: UpdateOrderDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Order> {
    const order = await this.findOne(id);

    const isStaff =
      userRole === UserRole.ADMIN || userRole === UserRole.ASISTENTE;

    // Validación 1: Verificar propiedad de la orden
    // Si no es ADMIN/ASISTENTE, solo puede editar sus propias órdenes
    if (!isStaff) {
      if (order.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para editar esta orden',
        );
      }
    }

    // El staff (ADMIN/ASISTENTE) puede editar SOLO las notas en cualquier estado
    // (p. ej. registrar el motivo de una cancelación). El resto de campos y
    // cualquier edición de un cliente siguen restringidos a órdenes PENDIENTE.
    const onlyEditsNotes =
      updateData.notes !== undefined &&
      updateData.contactInfo === undefined &&
      updateData.businessInfo === undefined &&
      updateData.items === undefined;

    const canEditNotesAnyStatus = isStaff && onlyEditsNotes;

    // Validación 2: Solo se pueden editar órdenes PENDIENTE
    if (order.status !== OrderStatus.PENDIENTE && !canEditNotesAnyStatus) {
      throw new BadRequestException(
        `No se pueden modificar órdenes con estado ${order.status}. Solo las órdenes PENDIENTE pueden ser editadas.`,
      );
    }

    // Actualizar campos permitidos
    if (updateData.contactInfo) {
      order.contactInfo = { ...order.contactInfo, ...updateData.contactInfo };
    }

    if (updateData.businessInfo) {
      order.businessInfo = { ...order.businessInfo, ...updateData.businessInfo };
    }

    if (updateData.items) {
      order.items = await this.pricedItems(order, updateData.items);
      // Recalcular total si se modificaron items
      order.totalAmount = this.calculateTotal(order.items);
    }

    if (updateData.notes !== undefined) {
      order.notes = updateData.notes;
    }

    return this.orderRepository.save(order);
  }

  /**
   * Igual que el checkout (EmailController.sendOrderEmail): el precio unitario
   * se recalcula acá a partir del precio base del producto y la lista del
   * dueño del pedido. Se ignora el unitPrice que manda el front: para el staff
   * es el precio base sin recargo (le pisaría la lista al cliente) y para un
   * cliente sería manipulable. Nombre del producto: el de la BD.
   */
  private async pricedItems(
    order: Order,
    items: OrderItemDto[],
  ): Promise<OrderItemData[]> {
    if (items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }
    const invalid = items.find(
      (item) => !Number.isInteger(item.quantity) || item.quantity < 1,
    );
    if (invalid) {
      throw new BadRequestException(
        `Cantidad inválida para el producto ${invalid.productId}`,
      );
    }

    const ids = [...new Set(items.map((item) => item.productId))];
    const products = await this.productRepository.find({
      where: { id: In(ids) },
      select: ['id', 'name', 'price'],
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Productos inexistentes: ${missing.join(', ')}`,
      );
    }

    // Lista de precios del dueño del pedido (no del que edita).
    const owner = await this.userRepository.findOne({
      where: { id: order.userId },
      select: ['id', 'rol'],
    });
    const rol = owner?.rol ?? null;
    const percentage = esCategoriaB2B(rol)
      ? await this.pricingService.getPercentage(rol)
      : 0;

    // Si el dueño ya no tiene lista (perdió la categoría B2B), se conserva el
    // precio que ya tenía cada ítem en vez de pisar el total con 0.
    const previous = new Map(
      order.items.map((item) => [item.productId, item.unitPrice]),
    );

    // Bultos: un ítem que ya estaba en el pedido conserva su copia (histórico);
    // uno nuevo toma los bultos vigentes del producto + presentación.
    const previousBultos = new Map(
      order.items.map((item) => [
        BultoService.key(item.productId, item.presentation),
        item.bultos,
      ]),
    );
    const currentBultos = await this.bultoService.snapshotFor(items);

    return items.map((item) => {
      const k = BultoService.key(item.productId, item.presentation);
      const product = byId.get(item.productId)!;
      const unitPrice = this.pricingService.applyRolePricing(
        Number(product.price),
        rol,
        percentage,
      );
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice ?? previous.get(item.productId),
        presentation: item.presentation,
        bultos: previousBultos.get(k) ?? currentBultos.get(k),
      };
    });
  }

  private calculateTotal(items: OrderItemData[]): number {
    return items.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * item.quantity;
      return sum + itemTotal;
    }, 0);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }
}
