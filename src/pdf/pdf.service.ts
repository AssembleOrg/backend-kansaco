import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { SendOrderEmailDto } from '../email/dto/send-order-email.dto';
import { PresupuestoData, PresupuestoProducto } from './presupuesto.types';
import { Order } from '../order/order.entity';
const sharp = require('sharp');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private template: Handlebars.TemplateDelegate;

  constructor() {
    // Cargar y compilar la plantilla Handlebars
    // En desarrollo: src/pdf/templates/presupuesto.hbs
    // En producción: dist/pdf/templates/presupuesto.hbs
    const templatePath = path.join(__dirname, 'templates', 'presupuesto.hbs');

    // Si no existe en __dirname (producción), intentar desde process.cwd() (desarrollo)
    let finalPath = templatePath;
    if (!fs.existsSync(templatePath)) {
      const devPath = path.join(
        process.cwd(),
        'src',
        'pdf',
        'templates',
        'presupuesto.hbs',
      );
      if (fs.existsSync(devPath)) {
        finalPath = devPath;
      }
    }

    try {
      const html = fs.readFileSync(finalPath, 'utf8');
      this.template = Handlebars.compile(html);

      // Registrar helpers de Handlebars
      Handlebars.registerHelper('currency', (value: number) => {
        if (value === null || value === undefined || isNaN(value)) {
          return '-';
        }
        return value.toLocaleString('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2,
        });
      });

      this.logger.log(`Plantilla Handlebars cargada desde: ${finalPath}`);
    } catch (error: any) {
      this.logger.error(
        `Error cargando plantilla desde ${finalPath}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Genera un PDF de presupuesto desde una Order entity
   */
  async generatePresupuestoPdfFromOrder(
    order: Order,
    presupuestoNumber: string,
  ): Promise<Buffer> {
    // Convertir Order a SendOrderEmailDto
    const orderData: SendOrderEmailDto = {
      customerType: order.customerType,
      contactInfo: order.contactInfo,
      businessInfo: order.businessInfo,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        presentation: item.presentation,
      })),
      totalAmount: order.totalAmount ? Number(order.totalAmount) : undefined,
      notes: order.notes,
    };

    return this.generatePresupuestoPdf(orderData, presupuestoNumber);
  }

  /**
   * Genera un PDF de presupuesto usando Puppeteer + Handlebars
   */
  async generatePresupuestoPdf(
    orderData: SendOrderEmailDto,
    presupuestoNumber: string,
  ): Promise<Buffer> {
    try {
      // Convertir SendOrderEmailDto a PresupuestoData
      const presupuestoData = await this.convertToPresupuestoData(
        orderData,
        presupuestoNumber,
      );

      // Compilar HTML con Handlebars
      const html = this.template(presupuestoData);

      // Generar PDF con Puppeteer
      // En producción (Railway, Docker, etc.), Puppeteer necesita configuración especial
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--single-process', // Útil para entornos con recursos limitados
        ],
      };

      // Intentar obtener el ejecutable de Chrome de Puppeteer
      // Esto funciona tanto en desarrollo como en producción si Chrome está instalado
      try {
        const puppeteerExecutablePath = puppeteer.executablePath();
        if (puppeteerExecutablePath && fs.existsSync(puppeteerExecutablePath)) {
          launchOptions.executablePath = puppeteerExecutablePath;
          this.logger.log(`Usando Chrome desde: ${puppeteerExecutablePath}`);
        } else {
          this.logger.warn(
            `Chrome no encontrado en: ${puppeteerExecutablePath}. Puppeteer intentará encontrarlo automáticamente.`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `Error obteniendo ruta de Chrome: ${error.message}. Puppeteer intentará encontrarlo automáticamente.`,
        );
      }

      const browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      // Configurar viewport para A4
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      });

      // Cargar HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generar PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      await browser.close();

      this.logger.log(`PDF generado exitosamente: ${presupuestoNumber}`);
      return Buffer.from(pdf);
    } catch (error: any) {
      this.logger.error(`Error generando PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convierte SendOrderEmailDto a PresupuestoData
   */
  private async convertToPresupuestoData(
    orderData: SendOrderEmailDto,
    presupuestoNumber: string,
  ): Promise<PresupuestoData> {
    // Cargar y convertir logo a base64
    const logoPath = path.join(process.cwd(), 'public', 'LogKan.webp');
    let logoBase64 = '';

    try {
      if (fs.existsSync(logoPath)) {
        // Convertir WebP a PNG y luego a base64
        const pngBuffer = await sharp(logoPath).png().toBuffer();
        logoBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
        this.logger.debug('Logo convertido a base64');
      } else {
        this.logger.warn(`Logo no encontrado en: ${logoPath}`);
      }
    } catch (e: any) {
      this.logger.warn(`Error cargando logo: ${e.message}`);
    }

    // Formatear fecha
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

    // Convertir productos
    const productos: PresupuestoProducto[] = orderData.items.map((item) => ({
      cantidad: item.quantity,
      nombre: item.productName,
      presentacion: item.presentation || '-',
      precioUnitario: item.unitPrice || 0,
      subtotal: (item.unitPrice || 0) * item.quantity,
    }));

    // Calcular totales (aunque se muestren como "-")
    const subtotal = productos.reduce((sum, p) => sum + p.subtotal, 0);
    const ivaPorcentaje = 21;
    const ivaMonto = subtotal * (ivaPorcentaje / 100);
    const total = subtotal + ivaMonto;

    // Obtener localidad del cliente
    const localidad =
      orderData.businessInfo?.codigoPostal || 'CABA, Buenos Aires';

    return {
      empresa: {
        nombre: 'Kansaco Petroquimica S.A',
        cuit: '30-58610901-0',
        localidad: 'Magallanes 2031 Florencio Varela',
        telefono: '4237-2636',
        email: 'info@kansaco.com',
        logoUrl: logoBase64,
      },
      presupuesto: {
        numero: presupuestoNumber,
        fecha: fecha,
      },
      cliente: {
        razonSocial: orderData.contactInfo.fullName,
        telefono: orderData.contactInfo.phone,
        direccion: orderData.contactInfo.address,
        email: orderData.contactInfo.email,
        localidad: localidad,
      },
      productos: productos,
      condiciones: {
        formaPago: 'Transferencia Bancaria',
        validezDias: 15,
        notas: orderData.notes || '',
      },
      totales: {
        subtotal: subtotal,
        ivaPorcentaje: ivaPorcentaje,
        ivaMonto: ivaMonto,
        total: total,
      },
    };
  }
}
