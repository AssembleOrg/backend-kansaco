import {
  Body,
  Controller,
  Post,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendOrderEmailDto, OrderItemDto } from './dto/send-order-email.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { OrderService } from '../order/order.service';
import { RabbitmqClientService } from '../rabbitmq/rabbitmq-client.service';
import { ConfigService } from '@nestjs/config';
import { CustomerType } from './dto/send-order-email.dto';
import { PdfService } from '../pdf/pdf.service';
import { CartService } from '../cart/cart.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly orderService: OrderService,
    private readonly rabbitmqClient: RabbitmqClientService,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    private readonly cartService: CartService,
  ) {}

  @Post('send-order')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar email de pedido a Kansaco' })
  @ApiOkResponse({
    description: 'Email enviado correctamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Pedido enviado correctamente' },
        orderId: { type: 'string', example: 'uuid-order-id' },
        presupuestoNumber: { type: 'string', example: '2025-001' },
        pdfBase64: { type: 'string', example: 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9MZW5ndGggNCAwIFIvRmlsdGVyL0ZsYXRlRGVjb2RlPj4Kc3RyZWFtCngB...' },
      },
    },
  })
  async sendOrderEmail(
    @Request() req: { user: { id: string; email: string } },
    @Body() partialOrderData: SendOrderEmailDto,
  ): Promise<{ message: string; orderId: string; presupuestoNumber: string; pdfBase64: string }> {
    this.logger.log(`Recibido pedido de ${partialOrderData.contactInfo.fullName}`);

    // Obtener el carrito del usuario para incluir las presentaciones
    const cart = await this.cartService.getCartByUserId(req.user.id);
    
    // Construir los items del pedido desde el carrito, incluyendo presentaciones
    // Si el frontend envió items, los usamos pero completamos las presentaciones desde el carrito
    const items: OrderItemDto[] = cart.items.map((cartItem) => {
      // Buscar si el frontend envió este item (por productId)
      const frontendItem = partialOrderData.items?.find(
        (item) => item.productId === cartItem.productId,
      );
      
      return {
        productId: cartItem.productId,
        productName: frontendItem?.productName || cartItem.product?.name || 'Producto sin nombre',
        quantity: frontendItem?.quantity || cartItem.quantity,
        unitPrice: frontendItem?.unitPrice || cartItem.product?.price || undefined,
        presentation: cartItem.presentation || undefined, // Siempre usar presentación del carrito
      };
    });

    // Si el frontend no envió items, usar los del carrito. Si envió items, usar los del carrito con presentaciones
    const orderData: SendOrderEmailDto = {
      ...partialOrderData,
      items: items,
    };

    // Crear orden en la base de datos
    const order = await this.orderService.create(req.user.id, orderData);
    this.logger.log(`Orden creada con ID: ${order.id}`);

    // Generar PDF del presupuesto (se necesita para la respuesta y para RabbitMQ)
    const presupuestoNumber = this.generatePresupuestoNumber(order.id);
    const pdfBuffer = await this.pdfService.generatePresupuestoPdf(
      orderData,
      presupuestoNumber,
    );
    const pdfBase64 = pdfBuffer.toString('base64');

    // Enviar mensaje a RabbitMQ - el backend de intranet se encargará de enviar los emails
    // El backend de intranet espera el pattern 'send-email' con SendEmailDto
    try {
      const emailTo = this.configService.get<string>(
        'EMAIL_TO',
        'ventas@kansaco.com',
      );
      const emailSubject = `Nuevo Pedido Web - ${orderData.contactInfo.fullName} (${orderData.customerType === CustomerType.MAYORISTA ? 'Mayorista' : 'Minorista'})`;

      // Construir HTML y texto del email
      const htmlContent = this.emailService.buildOrderEmailHtml(orderData);
      const textContent = this.buildOrderEmailText(orderData);

      // Transformar datos del pedido al formato SendEmailDto que espera el backend de intranet
      // Enviar tanto al email configurado en ENV como al email del usuario registrado
      const sendEmailDto = {
        to: [
          {
            email: emailTo,
            name: 'Asistente de Ventas Kansaco',
          },
          {
            email: req.user.email,
            name: orderData.contactInfo.fullName,
          },
        ],
        subject: emailSubject,
        htmlContent: htmlContent,
        textContent: textContent,
        attachments: [
          {
            name: `Presupuesto_${presupuestoNumber}_${orderData.contactInfo.fullName.replace(/\s/g, '_')}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ],
      };

      const sent = await this.rabbitmqClient.sendMessage(
        'send-email',
        sendEmailDto,
      );
      if (sent) {
        this.logger.log(
          `Mensaje enviado a RabbitMQ (send-email) para orden ${order.id} - será procesado por backend de intranet`,
        );
      } else {
        this.logger.warn(
          `No se pudo enviar mensaje a RabbitMQ para orden ${order.id}`,
        );
      }
    } catch (error: any) {
      // No fallar el endpoint si RabbitMQ falla
      this.logger.error(`Error al enviar mensaje a RabbitMQ: ${error.message}`);
    }

    return {
      message: 'Pedido enviado correctamente',
      orderId: order.id,
      presupuestoNumber: presupuestoNumber,
      pdfBase64: pdfBase64,
    };
  }

  /**
   * Construye el contenido de texto plano del email para el backend de intranet
   */
  private buildOrderEmailText(orderData: SendOrderEmailDto): string {
    const isMayorista = orderData.customerType === CustomerType.MAYORISTA;

    let itemsText = orderData.items
      .map(
        (item) =>
          `  - ${item.productName} (Cantidad: ${item.quantity}${item.presentation ? `, Presentación: ${item.presentation}` : ''})`,
      )
      .join('\n');

    let businessInfoText = '';
    if (isMayorista && orderData.businessInfo) {
      businessInfoText = `
DATOS FISCALES:
  CUIT: ${orderData.businessInfo.cuit}
  ${orderData.businessInfo.razonSocial ? `Razón Social: ${orderData.businessInfo.razonSocial}\n  ` : ''}Situación AFIP: ${orderData.businessInfo.situacionAfip}
  ${orderData.businessInfo.codigoPostal ? `Código Postal: ${orderData.businessInfo.codigoPostal}` : ''}
`;
    }

    return `
NUEVO PEDIDO WEB

Tipo de Cliente: ${isMayorista ? 'MAYORISTA' : 'MINORISTA'}

DATOS DE CONTACTO:
  Nombre: ${orderData.contactInfo.fullName}
  Email: ${orderData.contactInfo.email}
  Teléfono: ${orderData.contactInfo.phone}
  Dirección: ${orderData.contactInfo.address}

${businessInfoText}
PRODUCTOS:
${itemsText}

${orderData.notes ? `NOTAS DEL CLIENTE:\n  ${orderData.notes}\n` : ''}
Fecha: ${new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}
    `.trim();
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
}
