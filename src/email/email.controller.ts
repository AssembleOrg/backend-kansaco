import { Body, Controller, Post, UseGuards, Logger, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendOrderEmailDto } from './dto/send-order-email.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { OrderService } from '../order/order.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly orderService: OrderService,
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
      },
    },
  })
  async sendOrderEmail(
    @Request() req: { user: { id: string } },
    @Body() orderData: SendOrderEmailDto,
  ): Promise<{ message: string; orderId: string }> {
    this.logger.log(`Recibido pedido de ${orderData.contactInfo.fullName}`);

    // Crear orden en la base de datos
    const order = await this.orderService.create(req.user.id, orderData);
    this.logger.log(`Orden creada con ID: ${order.id}`);

    // Enviar emails
    await this.emailService.sendOrderEmail(orderData);

    return { message: 'Pedido enviado correctamente', orderId: order.id };
  }
}
