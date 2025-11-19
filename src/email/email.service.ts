import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { SendOrderEmailDto, CustomerType } from './dto/send-order-email.dto';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOrderEmail(orderData: SendOrderEmailDto): Promise<void> {
    const toEmail = this.configService.get<string>('EMAIL_TO', 'ventas@kansaco.com');
    const fromEmail = this.configService.get<string>('SMTP_USER');

    // Email a Kansaco
    const mailToKansaco = {
      from: `"Kansaco Web" <${fromEmail}>`,
      to: toEmail,
      subject: `Nuevo Pedido Web - ${orderData.contactInfo.fullName} (${orderData.customerType === CustomerType.MAYORISTA ? 'Mayorista' : 'Minorista'})`,
      html: this.buildOrderEmailHtml(orderData),
    };

    // Email de confirmación al cliente
    const mailToCustomer = {
      from: `"Kansaco" <${fromEmail}>`,
      to: orderData.contactInfo.email,
      subject: 'Confirmación de tu pedido - Kansaco',
      html: this.buildConfirmationEmailHtml(orderData),
    };

    try {
      // Enviar a Kansaco
      await this.transporter.sendMail(mailToKansaco);
      this.logger.log(`Email de pedido enviado a ${toEmail}`);

      // Enviar confirmación al cliente
      await this.transporter.sendMail(mailToCustomer);
      this.logger.log(`Email de confirmación enviado a ${orderData.contactInfo.email}`);
    } catch (error) {
      this.logger.error('Error enviando email:', error);
      throw error;
    }
  }

  private buildOrderEmailHtml(orderData: SendOrderEmailDto): string {
    const isMayorista = orderData.customerType === CustomerType.MAYORISTA;

    let itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Consultar</td>
      </tr>
    `).join('');

    let businessInfoHtml = '';
    if (isMayorista && orderData.businessInfo) {
      businessInfoHtml = `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
          <h3 style="color: #16a245; margin-bottom: 10px;">Datos Fiscales</h3>
          <p><strong>CUIT:</strong> ${orderData.businessInfo.cuit}</p>
          ${orderData.businessInfo.razonSocial ? `<p><strong>Razón Social:</strong> ${orderData.businessInfo.razonSocial}</p>` : ''}
          <p><strong>Situación AFIP:</strong> ${orderData.businessInfo.situacionAfip}</p>
          ${orderData.businessInfo.codigoPostal ? `<p><strong>Código Postal:</strong> ${orderData.businessInfo.codigoPostal}</p>` : ''}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevo Pedido - Kansaco</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #16a245; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">NUEVO PEDIDO WEB</h1>
        </div>

        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background-color: ${isMayorista ? '#fef3c7' : '#dbeafe'}; padding: 10px 15px; border-radius: 5px; margin-bottom: 20px;">
            <strong>Tipo de Cliente:</strong> ${isMayorista ? 'MAYORISTA' : 'MINORISTA'}
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background-color: #fff; border-radius: 8px; border: 1px solid #eee;">
            <h3 style="color: #16a245; margin-bottom: 10px;">Datos de Contacto</h3>
            <p><strong>Nombre:</strong> ${orderData.contactInfo.fullName}</p>
            <p><strong>Email:</strong> ${orderData.contactInfo.email}</p>
            <p><strong>Teléfono:</strong> ${orderData.contactInfo.phone}</p>
            <p><strong>Dirección:</strong> ${orderData.contactInfo.address}</p>
          </div>

          ${businessInfoHtml}

          <div style="margin-bottom: 20px;">
            <h3 style="color: #16a245; margin-bottom: 10px;">Productos</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #fff;">
              <thead>
                <tr style="background-color: #16a245; color: white;">
                  <th style="padding: 10px; text-align: left;">Producto</th>
                  <th style="padding: 10px; text-align: center;">Cantidad</th>
                  <th style="padding: 10px; text-align: right;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          ${orderData.notes ? `
            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff9c4; border-radius: 8px;">
              <h3 style="color: #f59e0b; margin-bottom: 10px;">Notas del Cliente</h3>
              <p>${orderData.notes}</p>
            </div>
          ` : ''}

          <div style="text-align: center; padding: 15px; background-color: #16a245; border-radius: 8px;">
            <p style="color: white; margin: 0; font-weight: bold;">
              Fecha: ${new Date().toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildConfirmationEmailHtml(orderData: SendOrderEmailDto): string {
    let itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmación de Pedido - Kansaco</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #16a245; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">¡Gracias por tu pedido!</h1>
        </div>

        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hola <strong>${orderData.contactInfo.fullName}</strong>,</p>

          <p>Hemos recibido tu pedido correctamente. Nuestro equipo se pondrá en contacto contigo a la brevedad para coordinar el pago y envío.</p>

          <div style="margin: 20px 0; padding: 15px; background-color: #fff; border-radius: 8px; border: 1px solid #eee;">
            <h3 style="color: #16a245; margin-bottom: 10px;">Resumen de tu pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 8px; text-align: left;">Producto</th>
                  <th style="padding: 8px; text-align: center;">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div style="margin: 20px 0; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
            <p style="margin: 0;"><strong>Dirección de envío:</strong><br>${orderData.contactInfo.address}</p>
          </div>

          <p>Si tienes alguna consulta, no dudes en contactarnos:</p>
          <ul>
            <li>Email: info@kansaco.com</li>
            <li>Teléfono: 4237-2636 / 1365 / 0813</li>
          </ul>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="font-size: 12px; color: #666; text-align: center;">
            Este es un email automático, por favor no respondas a esta dirección.<br>
            © ${new Date().getFullYear()} Kansaco - Lubricantes de Alta Performance
          </p>
        </div>
      </body>
      </html>
    `;
  }
}
