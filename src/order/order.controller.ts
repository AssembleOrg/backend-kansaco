import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@ApiTags('Order')
@Controller('order')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiOperation({ summary: 'Obtener todas las órdenes (admin)' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes' })
  async findAll(): Promise<{ status: string; data: Order[] }> {
    const orders = await this.orderService.findAll();
    return { status: 'success', data: orders };
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Obtener órdenes del usuario actual' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del usuario' })
  async findMyOrders(
    @Request() req: { user: { id: string } },
  ): Promise<{ status: string; data: Order[] }> {
    const orders = await this.orderService.findByUserId(req.user.id);
    return { status: 'success', data: orders };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden por ID' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado para ver esta orden' })
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: UserRole } },
  ): Promise<{ status: string; data: Order }> {
    const order = await this.orderService.findOne(id);

    // Verificar ownership: el usuario debe ser dueño de la orden o ser Admin/Asistente
    const isOwner = order.userId === req.user.id;
    const isAdminOrAsistente = req.user.role === UserRole.ADMIN || req.user.role === UserRole.ASISTENTE;

    if (!isOwner && !isAdminOrAsistente) {
      throw new ForbiddenException('No tienes permiso para ver esta orden');
    }

    return { status: 'success', data: order };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiOperation({ summary: 'Actualizar estado de una orden' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<{ status: string; data: Order }> {
    const order = await this.orderService.updateStatus(id, updateStatusDto.status);
    return { status: 'success', data: order };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una orden' })
  @ApiResponse({ status: 200, description: 'Orden eliminada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ status: string; message: string }> {
    await this.orderService.remove(id);
    return { status: 'success', message: 'Order deleted successfully' };
  }
}
