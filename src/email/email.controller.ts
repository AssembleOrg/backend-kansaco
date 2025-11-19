import { Body, Controller, Post, UseGuards, Logger } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendOrderEmailDto } from './dto/send-order-email.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

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
      },
    },
  })
  async sendOrderEmail(
    @Body() orderData: SendOrderEmailDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Recibido pedido de ${orderData.contactInfo.fullName}`);

    await this.emailService.sendOrderEmail(orderData);

    return { message: 'Pedido enviado correctamente' };
  }
}
