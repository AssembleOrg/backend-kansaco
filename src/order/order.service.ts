import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.enum';
import { now } from '../helpers/date.helper';
import { escapeLike, OrderFilters } from './order-filters';
import { OrderItemDto, SendOrderEmailDto } from '../email/dto/send-order-email.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { esCategoriaB2B, UserRole } from '../user/user.enum';
import { OrderItemData } from './order.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { PricingService } from '../pricing/pricing.service';
import { BultoService } from '../bulto/bulto.service';

export const EXPORT_MAX = 5000;

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
    filters: OrderFilters = {},
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    countsByStatus: Record<OrderStatus, number>;
  }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.filteredQuery(filters)
      .orderBy(this.dateColumn(filters), filters.orden === 'asc' ? 'ASC' : 'DESC')
      // Desempate estable: sin esto, pedidos con la misma fecha se repiten/saltan entre páginas.
      .addOrderBy('o.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      countsByStatus: await this.countsByStatus(filters),
    };
  }

  /** Conteo por estado con los mismos filtros salvo el de estado (para los chips). */
  async countsByStatus(filters: OrderFilters): Promise<Record<OrderStatus, number>> {
    const rows: { status: OrderStatus; count: string }[] = await this.filteredQuery({
      ...filters,
      status: undefined,
    })
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();
    const counts = Object.fromEntries(
      Object.values(OrderStatus).map((s) => [s, 0]),
    ) as Record<OrderStatus, number>;
    rows.forEach((r) => (counts[r.status] = Number(r.count)));
    return counts;
  }

  /** Pedidos para exportar (sin paginar). Corta si el rango es demasiado grande. */
  async findForExport(filters: OrderFilters): Promise<Order[]> {
    const orders = await this.filteredQuery(filters)
      .orderBy(this.dateColumn(filters), 'ASC')
      .take(EXPORT_MAX + 1)
      .getMany();
    // ponytail: tope fijo en memoria; streamear si alguna vez hace falta más.
    if (orders.length > EXPORT_MAX) {
      throw new BadRequestException(
        `Más de ${EXPORT_MAX} pedidos: acotá el rango de fechas o los filtros.`,
      );
    }
    return orders;
  }

  /** SKU (= familia Tango) de los productos de los pedidos, por productId. */
  async skusFor(orders: Order[]): Promise<Map<number, string>> {
    const ids = [
      ...new Set(
        orders.flatMap((o) => o.items.map((i) => i.productId)).filter((id): id is number => id != null),
      ),
    ];
    if (!ids.length) return new Map();
    const products = await this.productRepository.find({
      where: { id: In(ids) },
      select: ['id', 'sku'],
    });
    return new Map(products.map((p) => [p.id, p.sku]));
  }

  /** Categoría actual de cada cuenta de los pedidos, por userId. */
  async rolesFor(orders: Order[]): Promise<Map<string, UserRole>> {
    const ids = [...new Set(orders.map((o) => o.userId))];
    if (!ids.length) return new Map();
    const users = await this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'rol'],
    });
    return new Map(users.map((u) => [u.id, u.rol]));
  }

  private dateColumn(f: OrderFilters): string {
    return f.dateField === 'created' ? 'o.createdAt' : 'o.statusChangedAt';
  }

  private filteredQuery(f: OrderFilters): SelectQueryBuilder<Order> {
    const qb = this.orderRepository.createQueryBuilder('o');
    if (f.status?.length) qb.andWhere('o.status IN (:...status)', { status: f.status });
    if (f.categoria) {
      qb.andWhere('o.userId IN (SELECT u.id FROM "user" u WHERE u.rol = :rol)', { rol: f.categoria });
    }
    if (f.provincia) {
      qb.andWhere(`o."contactInfo"->>'provincia' ILIKE :prov`, { prov: escapeLike(f.provincia) });
    }
    const col = this.dateColumn(f);
    if (f.start) qb.andWhere(`${col} >= :start`, { start: f.start });
    if (f.end) qb.andWhere(`${col} < :end`, { end: f.end });
    const q = f.q?.trim();
    if (q) {
      qb.andWhere(
        new Brackets((w) => {
          const like = `%${escapeLike(q)}%`;
          for (const expr of [
            `o."contactInfo"->>'fullName'`,
            `o."contactInfo"->>'email'`,
            `o."contactInfo"->>'phone'`,
            `o."businessInfo"->>'cuit'`,
            `o."businessInfo"->>'razonSocial'`,
            `o.id::text`,
          ]) {
            w.orWhere(`${expr} ILIKE :like`, { like });
          }
        }),
      );
    }
    return qb;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== status) {
      order.status = status;
      order.statusChangedAt = now();
    }
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
      order.items = await this.pricedItems(order, updateData.items, isStaff);
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
   *
   * Producto excepcional (productId null): línea libre que carga el staff
   * (descripción, cantidad, envase), sin precio ni bultos. Un cliente solo
   * puede conservarla tal cual o quitarla.
   */
  private async pricedItems(
    order: Order,
    items: OrderItemDto[],
    isStaff: boolean,
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

    const libreKey = (i: { productName: string; presentation?: string; quantity: number }) =>
      `${i.productName}|${i.presentation ?? ''}|${i.quantity}`;
    const libresPrevias = new Set(
      order.items.filter((i) => i.productId == null).map(libreKey),
    );
    for (const item of items.filter((i) => i.productId == null)) {
      if (!item.productName?.trim()) {
        throw new BadRequestException('El producto excepcional necesita una descripción');
      }
      if (!isStaff && !libresPrevias.has(libreKey(item))) {
        throw new ForbiddenException('Solo el equipo comercial puede cargar productos excepcionales');
      }
    }

    const ids = [
      ...new Set(
        items.filter((i) => i.productId != null).map((i) => i.productId as number),
      ),
    ];
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
    const conProducto = items.filter((i) => i.productId != null) as {
      productId: number;
      presentation?: string;
    }[];
    const currentBultos = await this.bultoService.snapshotFor(conProducto);
    // Códigos Tango: misma regla que bultos (el ítem existente conserva su copia).
    const previousSkus = new Map(
      order.items.map((item) => [BultoService.key(item.productId, item.presentation), item.skus]),
    );
    const currentSkus = await this.bultoService.snapshotSkus(conProducto);

    return items.map((item) => {
      if (item.productId == null) {
        return {
          productId: null,
          productName: item.productName.trim(),
          quantity: item.quantity,
          presentation: item.presentation?.trim() || undefined,
        };
      }
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
        skus: previousSkus.get(k) ?? currentSkus.get(k),
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
