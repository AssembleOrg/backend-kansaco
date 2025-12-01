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
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';
import { PaginatedResponse } from '../product/dto/pagination.dto';
import { PdfService } from '../pdf/pdf.service';

@ApiTags('Order')
@Controller('order')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly pdfService: PdfService,
  ) {}

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

  @Get('my-orders/paginated')
  @ApiOperation({ summary: 'Obtener órdenes confirmadas del usuario actual (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página (máximo 100, por defecto: 20)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista paginada de órdenes confirmadas del usuario. El TransformInterceptor global envuelve la respuesta en { status: "success", data: ... }',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 3 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  async findMyOrdersPaginated(
    @Request() req: { user: { id: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<Order>> {
    const pageNumber = page ? Number(page) : 1;
    const limitNumber = limit ? Number(limit) : 20;
    
    // Validar límites
    const validLimit = Math.min(Math.max(1, limitNumber), 100);
    const validPage = Math.max(1, pageNumber);

    const result = await this.orderService.findByUserIdPaginated(
      req.user.id,
      validPage,
      validLimit,
    );

    // El TransformInterceptor global se encarga de envolver en { status: 'success', data: ... }
    return result;
  }

  @Get('all/paginated')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiOperation({ summary: 'Obtener todas las órdenes del sistema (paginado, solo ADMIN/ASISTENTE)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página (mínimo 20, máximo 100, por defecto: 20)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista paginada de todas las órdenes. El TransformInterceptor global envuelve la respuesta en { status: "success", data: ... }',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '50106563-b3c7-440d-a98b-171c70f7c8d2' },
                  userId: { type: 'string', example: 'd641b37b-360f-46e8-996f-fcd5d20b4cf5' },
                  customerType: { type: 'string', enum: ['CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA'], example: 'CLIENTE_MINORISTA' },
                  status: { type: 'string', enum: ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'COMPLETADO', 'CANCELADO'], example: 'PENDIENTE' },
                  contactInfo: {
                    type: 'object',
                    properties: {
                      fullName: { type: 'string', example: 'Admin Sistema' },
                      email: { type: 'string', example: 'admin@kansaco.com' },
                      phone: { type: 'string', example: '1136585581' },
                      address: { type: 'string', example: 'Juan de la cruz contreras 575, florencio varela, buenos aires, argentina' },
                    },
                  },
                  businessInfo: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      cuit: { type: 'string', example: '20-12345678-9' },
                      razonSocial: { type: 'string', example: 'Empresa S.A.' },
                      situacionAfip: { type: 'string', example: 'Responsable Inscripto' },
                      codigoPostal: { type: 'string', example: '1888' },
                    },
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'number', example: 55 },
                        productName: { type: 'string', example: 'SAVIA J 10W 40 SINTETICO' },
                        quantity: { type: 'number', example: 1 },
                        unitPrice: { type: 'number', example: 1 },
                        presentation: { type: 'string', example: 'Balde 20 Litros' },
                      },
                    },
                  },
                  totalAmount: { type: 'string', example: '1.00' },
                  notes: { type: 'string', nullable: true, example: 'safasffsafsasaffsasaf' },
                  createdAt: { type: 'string', example: '2025-11-26T06:34:25.660-03:00' },
                  updatedAt: { type: 'string', example: '2025-11-26T06:34:25.660-03:00' },
                },
              },
            },
            total: { type: 'number', example: 150 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 8 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  async findAllPaginated(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<Order>> {
    const pageNumber = page ? Number(page) : 1;
    const limitNumber = limit ? Number(limit) : 20;
    
    // Validar límites: mínimo 20, máximo 100
    const validLimit = Math.min(Math.max(20, limitNumber), 100);
    const validPage = Math.max(1, pageNumber);

    const result = await this.orderService.findAllPaginated(
      validPage,
      validLimit,
    );

    // El TransformInterceptor global se encarga de envolver en { status: 'success', data: ... }
    return result;
  }

  @Get(':id/pdf')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiOperation({ summary: 'Descargar PDF de un pedido específico (solo ADMIN/ASISTENTE)' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF del pedido. El archivo se descarga con el nombre: Presupuesto_{año}-{id}_{nombre_cliente}.pdf. El PDF contiene la misma información y formato que se envía por email al cliente, incluyendo: datos de la empresa, datos del cliente, lista de productos con presentaciones, totales con IVA, y condiciones de pago.',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF binario del presupuesto. Headers de respuesta: Content-Type: application/pdf, Content-Disposition: attachment; filename="Presupuesto_2025-ABC_Admin_Sistema.pdf", Content-Length: {tamaño_en_bytes}',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Orden no encontrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Order with ID 50106563-b3c7-440d-a98b-171c70f7c8d2 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async downloadOrderPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const order = await this.orderService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Generar número de presupuesto basado en el ID de la orden
    const presupuestoNumber = this.generatePresupuestoNumber(order.id);

    // Generar PDF desde la Order entity
    const pdfBuffer = await this.pdfService.generatePresupuestoPdfFromOrder(
      order,
      presupuestoNumber,
    );

    // Configurar headers para descarga
    const fileName = `Presupuesto_${presupuestoNumber}_${order.contactInfo.fullName.replace(/\s/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  }

  /**
   * Genera un número de presupuesto basado en el año y el ID de la orden
   */
  private generatePresupuestoNumber(orderId: string): string {
    const year = new Date().getFullYear();
    // Usar los últimos 3 caracteres del UUID para crear un número único
    const shortId = orderId.split('-').pop()?.substring(0, 3).toUpperCase() || '001';
    return `${year}-${shortId}`;
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
