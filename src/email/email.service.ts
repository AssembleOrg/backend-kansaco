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
    // SMTP no es necesario aquí - los emails se envían desde el backend de intranet vía RabbitMQ
    // Solo inicializamos el transporter si se necesita para desarrollo/testing
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpUser && smtpPass) {
      // Solo crear transporter si hay credenciales (para desarrollo/testing opcional)
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('✅ SMTP transporter initialized (optional, emails are sent via RabbitMQ)');
    } else {
      this.logger.log('ℹ️  SMTP not configured  - emails will be sent via RabbitMQ to intranet backend');
      // Crear un transporter dummy para evitar errores, pero no se usará
      this.transporter = null as any;
    }
  }

  async sendOrderEmail(orderData: SendOrderEmailDto): Promise<void> {
    // Los emails se envían desde el backend de intranet vía RabbitMQ
    // Este método se mantiene por compatibilidad pero no envía emails localmente
    this.logger.log('ℹ️  Email sending is handled by intranet backend via RabbitMQ');
    
    // Si hay SMTP configurado (desarrollo/testing), se puede enviar opcionalmente
    if (this.transporter) {
      try {
        const toEmail = this.configService.get<string>('EMAIL_TO', 'ventas@kansaco.com');
        const fromEmail = this.configService.get<string>('SMTP_USER');
        
        if (fromEmail) {
          const mailToKansaco = {
            from: `"Kansaco Web" <${fromEmail}>`,
            to: toEmail,
            subject: `Nuevo Pedido Web - ${orderData.contactInfo.fullName} (${orderData.customerType === CustomerType.MAYORISTA ? 'Mayorista' : 'Minorista'})`,
            html: this.buildOrderEmailHtml(orderData),
          };

          await this.transporter.sendMail(mailToKansaco);
          this.logger.log(`📧 Email de pedido enviado localmente a ${toEmail} (desarrollo/testing)`);
        }
      } catch (error) {
        this.logger.warn('⚠️  Error enviando email local (no crítico, RabbitMQ enviará el email):', error);
        // No lanzar error - RabbitMQ se encargará
      }
    }
  }

  async sendPresupuestoEmail(data: {
    to: string;
    subject: string;
    htmlContent: string;
    attachments?: Array<{
      name: string;
      content: string; // base64
      contentType?: string;
    }>;
  }): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_USER');

    const mailOptions = {
      from: `"Kansaco Web" <${fromEmail}>`,
      to: data.to,
      subject: data.subject,
      html: data.htmlContent,
      attachments: data.attachments?.map((att) => ({
        filename: att.name,
        content: att.content,
        encoding: 'base64',
        contentType: att.contentType,
      })),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Presupuesto email sent to ${data.to}`);
    } catch (error) {
      this.logger.error('Error sending presupuesto email:', error);
      throw error;
    }
  }

  buildOrderEmailHtml(orderData: SendOrderEmailDto): string {
    const isMayorista = orderData.customerType === CustomerType.MAYORISTA;

    let itemsHtml = orderData.items.map((item, index) => {
      const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      return `
      <tr style="background-color: ${rowBgColor};">
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; font-weight: 500; color: #333;">${item.productName}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #666;">${item.presentation || '-'}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #666; font-weight: 600;">${item.quantity}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #666;">-</td>
      </tr>
    `;
    }).join('');

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
            <h3 style="color: #16a245; margin-bottom: 15px; font-size: 18px; font-weight: 600;">Productos</h3>
            <div style="overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <table style="width: 100%; border-collapse: collapse; background-color: #fff; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(135deg, #16a245 0%, #0d7a3a 100%);">
                    <th style="padding: 14px 15px; text-align: left; color: white; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2);">Producto</th>
                    <th style="padding: 14px 15px; text-align: center; color: white; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2);">Presentación</th>
                    <th style="padding: 14px 15px; text-align: center; color: white; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2);">Cantidad</th>
                    <th style="padding: 14px 15px; text-align: right; color: white; font-weight: 600; font-size: 13px; letter-spacing: 0.5px;">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
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
