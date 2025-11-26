import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from '../email/email.service';
import { ProductoService } from '../product/product.service';
import { GeneratePresupuestoDto } from './dto/generate-presupuesto.dto';
import { SendOrderEmailDto } from '../email/dto/send-order-email.dto';

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly productService: ProductoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genera el PDF de presupuesto y envía el email al asistente de ventas
   */
  async generateAndSendPresupuesto(data: GeneratePresupuestoDto) {
    try {
      this.logger.log(`Generating presupuesto for ${data.contactInfo.fullName}`);

      // Generar número de presupuesto si no se proporciona
      const presupuestoNumber = data.presupuestoNumber || this.generatePresupuestoNumber();

      // Generar PDF
      const pdfBuffer = await this.pdfService.generatePresupuestoPdf(
        data as SendOrderEmailDto,
        presupuestoNumber,
      );

      // Obtener imágenes de productos
      const productImages = await this.getProductImages(data.items);

      // Generar HTML del email con imágenes
      const emailHtml = this.buildPresupuestoEmailHtml(data, productImages, presupuestoNumber);

      // Enviar email
      const recipientEmail = data.recipientEmail || this.configService.get<string>('EMAIL_TO', 'ventas@kansaco.com');
      
      await this.emailService.sendPresupuestoEmail({
        to: recipientEmail,
        subject: `Nuevo Presupuesto #${presupuestoNumber} - ${data.contactInfo.fullName}`,
        htmlContent: emailHtml,
        attachments: [
          {
            name: `presupuesto-${presupuestoNumber}.pdf`,
            content: pdfBuffer.toString('base64'),
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`Presupuesto ${presupuestoNumber} generated and sent successfully`);

      return {
        success: true,
        presupuestoNumber,
        message: 'Presupuesto generado y enviado correctamente',
      };
    } catch (error) {
      this.logger.error('Error generating presupuesto:', error);
      throw new BadRequestException(`Error generando presupuesto: ${error.message}`);
    }
  }

  /**
   * Genera número de presupuesto en formato YYYY-XXX
   */
  private generatePresupuestoNumber(): string {
    const year = new Date().getFullYear();
    // En producción, esto debería consultar la BD para obtener el último número
    const sequence = Math.floor(Math.random() * 999) + 1;
    return `${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Obtiene las imágenes de los productos
   */
  private async getProductImages(items: GeneratePresupuestoDto['items']): Promise<Map<number, string[]>> {
    const imagesMap = new Map<number, string[]>();

    for (const item of items) {
      try {
        const images = await this.productService.getProductImages(item.productId);
        const imageUrls = images
          .sort((a, b) => (a.isPrimary ? -1 : 0) - (b.isPrimary ? -1 : 0) || a.order - b.order)
          .map((img) => img.imageUrl);
        imagesMap.set(item.productId, imageUrls);
      } catch (error) {
        this.logger.warn(`Error getting images for product ${item.productId}:`, error);
        imagesMap.set(item.productId, []);
      }
    }

    return imagesMap;
  }

  /**
   * Construye el HTML del email con tabla de productos e imágenes
   */
  private buildPresupuestoEmailHtml(
    data: GeneratePresupuestoDto,
    productImages: Map<number, string[]>,
    presupuestoNumber: string,
  ): string {
    const logoPath = '/public/LogKan.webp';
    const logoBase64 = this.getLogoBase64();

    // Construir filas de la tabla con imágenes
    const itemsHtml = data.items.map((item) => {
      const images = productImages.get(item.productId) || [];
      const primaryImage = images[0] || '';
      
      // Construir celdas de imágenes (máximo 3 imágenes por producto)
      const imageCells = images.slice(0, 3).map((imgUrl) => `
        <td style="padding: 5px; text-align: center; vertical-align: middle;">
          <img src="${imgUrl}" alt="Producto ${item.productName}" 
               style="max-width: 80px; max-height: 80px; border-radius: 4px; object-fit: cover;" />
        </td>
      `).join('');

      // Rellenar celdas vacías si hay menos de 3 imágenes
      const emptyCells = Array(3 - images.slice(0, 3).length)
        .fill('<td style="padding: 5px;"></td>')
        .join('');

      return `
        <tr style="background-color: #ffffff; border-bottom: 1px solid #eee;">
          <td style="padding: 10px; text-align: center; vertical-align: middle; font-weight: bold;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; vertical-align: middle;">
            <strong>${item.productName}</strong><br>
            <small style="color: #666;">${item.presentation || 'Sin presentación especificada'}</small>
          </td>
          <td style="padding: 5px; text-align: center; vertical-align: middle;">
            ${primaryImage ? `<img src="${primaryImage}" alt="${item.productName}" style="max-width: 100px; max-height: 100px; border-radius: 4px; object-fit: cover;" />` : '<span style="color: #999;">Sin imagen</span>'}
          </td>
          <td style="padding: 10px; text-align: right; vertical-align: middle;">
            ${item.unitPrice ? `$ ${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Consultar'}
          </td>
          <td style="padding: 10px; text-align: right; vertical-align: middle; font-weight: bold;">
            ${item.unitPrice ? `$ ${(item.unitPrice * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Consultar'}
          </td>
        </tr>
      `;
    }).join('');

    // Calcular totales
    const subtotal = data.items.reduce((sum, item) => 
      sum + (item.unitPrice ? item.unitPrice * item.quantity : 0), 0
    );
    const iva = subtotal * 0.21;
    const total = subtotal + iva;

    // Datos fiscales si es mayorista
    let businessInfoHtml = '';
    if (data.businessInfo) {
      businessInfoHtml = `
        <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #16a245;">
          <h3 style="color: #16a245; margin: 0 0 10px 0;">Datos Fiscales</h3>
          <p style="margin: 5px 0;"><strong>CUIT:</strong> ${data.businessInfo.cuit}</p>
          ${data.businessInfo.razonSocial ? `<p style="margin: 5px 0;"><strong>Razón Social:</strong> ${data.businessInfo.razonSocial}</p>` : ''}
          <p style="margin: 5px 0;"><strong>Situación AFIP:</strong> ${data.businessInfo.situacionAfip}</p>
          ${data.businessInfo.codigoPostal ? `<p style="margin: 5px 0;"><strong>Código Postal:</strong> ${data.businessInfo.codigoPostal}</p>` : ''}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Presupuesto #${presupuestoNumber} - Kansaco</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 900px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #16a245 0%, #0d7a2f 100%); padding: 30px; text-align: center;">
            ${logoBase64 ? `<img src="data:image/webp;base64,${logoBase64}" alt="Kansaco Logo" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
            <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 28px; font-weight: bold;">NUEVO PRESUPUESTO</h1>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Presupuesto #${presupuestoNumber}</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            
            <!-- Datos del Cliente -->
            <div style="margin-bottom: 25px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #16a245;">
              <h2 style="color: #16a245; margin: 0 0 15px 0; font-size: 18px;">DATOS DEL CLIENTE</h2>
              <p style="margin: 8px 0;"><strong>Razón Social:</strong> ${data.contactInfo.fullName}</p>
              <p style="margin: 8px 0;"><strong>Teléfono:</strong> ${data.contactInfo.phone}</p>
              <p style="margin: 8px 0;"><strong>Dirección:</strong> ${data.contactInfo.address}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${data.contactInfo.email}</p>
              <p style="margin: 8px 0;"><strong>Tipo de Cliente:</strong> ${data.customerType === 'CLIENTE_MAYORISTA' ? 'MAYORISTA' : 'MINORISTA'}</p>
            </div>

            ${businessInfoHtml}

            <!-- Tabla de Productos -->
            <div style="margin: 25px 0;">
              <h2 style="color: #16a245; margin: 0 0 15px 0; font-size: 18px;">DETALLE DE PRODUCTOS</h2>
              <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #ddd;">
                <thead>
                  <tr style="background-color: #16a245; color: #ffffff;">
                    <th style="padding: 12px; text-align: center; border: 1px solid #0d7a2f;">Cant.</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #0d7a2f;">Producto</th>
                    <th style="padding: 12px; text-align: center; border: 1px solid #0d7a2f;">Imagen</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #0d7a2f;">P. Unit.</th>
                    <th style="padding: 12px; text-align: right; border: 1px solid #0d7a2f;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <!-- Totales -->
            <div style="margin: 25px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
                  <td style="padding: 8px; text-align: right; width: 150px; font-weight: bold;">
                    $ ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px; text-align: right;">IVA (21%):</td>
                  <td style="padding: 8px; text-align: right;">
                    $ ${iva.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr style="border-top: 2px solid #16a245;">
                  <td style="padding: 12px; text-align: right; font-size: 18px; font-weight: bold; color: #16a245;">TOTAL:</td>
                  <td style="padding: 12px; text-align: right; font-size: 18px; font-weight: bold; color: #16a245;">
                    $ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Notas -->
            ${data.notes ? `
              <div style="margin: 25px 0; padding: 15px; background-color: #fff9c4; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0 0 10px 0;">NOTAS</h3>
                <p style="margin: 0;">${data.notes}</p>
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; text-align: center; border-top: 2px solid #16a245;">
              <p style="margin: 5px 0; color: #666; font-size: 12px;">
                El PDF del presupuesto se encuentra adjunto a este email.
              </p>
              <p style="margin: 5px 0; color: #666; font-size: 12px;">
                Fecha de generación: ${new Date().toLocaleString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Obtiene el logo en base64
   */
  private getLogoBase64(): string | null {
    try {
      const fs = require('fs');
      const path = require('path');
      const logoPath = path.join(process.cwd(), 'public', 'LogKan.webp');
      
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return logoBuffer.toString('base64');
      } else {
        this.logger.warn(`Logo not found at: ${logoPath}`);
      }
    } catch (error) {
      this.logger.warn('Error loading logo:', error);
    }
    return null;
  }
}

