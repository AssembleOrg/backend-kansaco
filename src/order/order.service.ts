import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.enum';
import { SendOrderEmailDto } from '../email/dto/send-order-email.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UserRole } from '../user/user.enum';
import { OrderItemData } from './order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async create(userId: string, orderData: SendOrderEmailDto): Promise<Order> {
    const order = this.orderRepository.create({
      userId,
      customerType: orderData.customerType,
      status: OrderStatus.PENDIENTE,
      contactInfo: orderData.contactInfo,
      businessInfo: orderData.businessInfo,
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

    // Validación 1: Verificar propiedad de la orden
    // Si no es ADMIN/ASISTENTE, solo puede editar sus propias órdenes
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.ASISTENTE) {
      if (order.userId !== userId) {
        throw new ForbiddenException(
          'No tienes permisos para editar esta orden',
        );
      }
    }

    // Validación 2: Solo se pueden editar órdenes PENDIENTE
    if (order.status !== OrderStatus.PENDIENTE) {
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
      order.items = updateData.items;
      // Recalcular total si se modificaron items
      order.totalAmount = this.calculateTotal(updateData.items);
    }

    if (updateData.notes !== undefined) {
      order.notes = updateData.notes;
    }

    return this.orderRepository.save(order);
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
