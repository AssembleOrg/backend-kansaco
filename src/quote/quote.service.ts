import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { Quote } from './quote.entity';
import { QuoteItem } from './quote-item.entity';
import { Deal } from '../deal/deal.entity';
import { Lead } from '../lead/lead.entity';
import { Product } from '../product/product.entity';
import { QuoteEstado } from './quote.enum';
import { QuoteCreateDto } from './dto/quote-create.dto';
import { QuoteUpdateDto } from './dto/quote-update.dto';
import { QuoteItemInputDto } from './dto/quote-item-input.dto';
import {
  QuoteItemResponseDto,
  QuoteResponseDto,
} from './dto/quote-response.dto';
import { PdfService } from '../pdf/pdf.service';
import { PresupuestoData } from '../pdf/presupuesto.types';
import { formatDateISO } from '../helpers/date.helper';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly itemRepo: Repository<QuoteItem>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly pdfService: PdfService,
  ) {}

  async findByDeal(dealId: number): Promise<QuoteResponseDto[]> {
    const quotes = await this.quoteRepo.find({
      where: { dealId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return quotes.map((q) => this.toResponseDto(q));
  }

  async findOne(id: number): Promise<QuoteResponseDto> {
    const quote = await this.findEntity(id);
    return this.toResponseDto(quote);
  }

  async create(dto: QuoteCreateDto): Promise<QuoteResponseDto> {
    const deal = await this.dealRepo.findOne({ where: { id: dto.dealId } });
    if (!deal) {
      throw new NotFoundException(`Deal ${dto.dealId} no encontrado`);
    }
    const ivaPct = dto.ivaPorcentaje ? Number(dto.ivaPorcentaje) : 21;
    if (Number.isNaN(ivaPct) || ivaPct < 0 || ivaPct > 100) {
      throw new BadRequestException('ivaPorcentaje fuera de rango (0-100)');
    }
    const items = await this.buildItemsFromDto(dto.items);
    const totals = this.calcTotals(items, ivaPct);

    const quoteId = await this.dataSource.transaction(async (manager) => {
      const numero = await this.generateNumero(manager);
      const quote = manager.create(Quote, {
        dealId: dto.dealId,
        numero,
        titulo: dto.titulo?.trim() ?? null,
        subtotal: totals.subtotal.toFixed(2),
        ivaPorcentaje: ivaPct.toFixed(2),
        ivaMonto: totals.ivaMonto.toFixed(2),
        total: totals.total.toFixed(2),
        estado: QuoteEstado.BORRADOR,
        validoHasta: dto.validoHasta ?? null,
        formaPago: dto.formaPago ?? 'Transferencia Bancaria',
        notas: dto.notas?.trim() ?? null,
        pdfUrl: null,
      });
      const savedQuote = await manager.save(quote);
      const itemEntities = items.map((it) =>
        manager.create(QuoteItem, { ...it, quoteId: savedQuote.id }),
      );
      await manager.save(itemEntities);
      await this.syncDealMontoTx(manager, dto.dealId);
      return savedQuote.id;
    });

    return this.findOne(quoteId);
  }

  async update(id: number, dto: QuoteUpdateDto): Promise<QuoteResponseDto> {
    const quote = await this.findEntity(id);
    if (quote.estado === QuoteEstado.ACEPTADO) {
      throw new BadRequestException(
        'No se puede modificar un presupuesto ACEPTADO',
      );
    }

    const ivaPct = dto.ivaPorcentaje
      ? Number(dto.ivaPorcentaje)
      : Number(quote.ivaPorcentaje);
    if (Number.isNaN(ivaPct) || ivaPct < 0 || ivaPct > 100) {
      throw new BadRequestException('ivaPorcentaje fuera de rango (0-100)');
    }

    let nextItems: Omit<QuoteItem, 'id' | 'quote' | 'quoteId' | 'createdAt' | 'product'>[] | null = null;
    if (dto.items) {
      const built = await this.buildItemsFromDto(dto.items);
      nextItems = built;
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.titulo !== undefined) quote.titulo = dto.titulo?.trim() ?? null;
      if (dto.validoHasta !== undefined)
        quote.validoHasta = dto.validoHasta ?? null;
      if (dto.formaPago !== undefined)
        quote.formaPago = dto.formaPago ?? 'Transferencia Bancaria';
      if (dto.notas !== undefined) quote.notas = dto.notas?.trim() ?? null;
      quote.ivaPorcentaje = ivaPct.toFixed(2);

      if (nextItems) {
        await manager.delete(QuoteItem, { quoteId: id });
        const totals = this.calcTotals(nextItems, ivaPct);
        quote.subtotal = totals.subtotal.toFixed(2);
        quote.ivaMonto = totals.ivaMonto.toFixed(2);
        quote.total = totals.total.toFixed(2);
        const itemEntities = nextItems.map((it) =>
          manager.create(QuoteItem, { ...it, quoteId: id }),
        );
        await manager.save(itemEntities);
      } else {
        const existingItems = await manager.find(QuoteItem, {
          where: { quoteId: id },
        });
        const totals = this.calcTotals(existingItems, ivaPct);
        quote.subtotal = totals.subtotal.toFixed(2);
        quote.ivaMonto = totals.ivaMonto.toFixed(2);
        quote.total = totals.total.toFixed(2);
      }

      await manager.save(quote);
      await this.syncDealMontoTx(manager, quote.dealId);
    });

    return this.findOne(id);
  }

  async changeEstado(
    id: number,
    estado: QuoteEstado,
  ): Promise<QuoteResponseDto> {
    const quote = await this.findEntity(id);
    if (quote.estado === estado) {
      throw new BadRequestException(`El presupuesto ya está en estado ${estado}`);
    }
    if (quote.estado === QuoteEstado.ACEPTADO && estado !== QuoteEstado.ACEPTADO) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un presupuesto ya ACEPTADO',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      quote.estado = estado;
      await manager.save(quote);
      await this.syncDealMontoTx(manager, quote.dealId);
    });
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const quote = await this.findEntity(id);
    if (quote.estado === QuoteEstado.ACEPTADO) {
      throw new BadRequestException(
        'No se puede eliminar un presupuesto ACEPTADO',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(quote);
      await this.syncDealMontoTx(manager, quote.dealId);
    });
  }

  async generatePdfBuffer(id: number): Promise<{ buffer: Buffer; numero: string }> {
    const quote = await this.findEntity(id);
    const deal = await this.dealRepo.findOne({
      where: { id: quote.dealId },
      relations: ['lead'],
    });
    if (!deal) {
      throw new NotFoundException(`Deal ${quote.dealId} no encontrado`);
    }
    const data = await this.toPresupuestoData(quote, deal.lead);
    const buffer = await this.pdfService.renderPresupuesto(data);
    return { buffer, numero: quote.numero };
  }

  private async findEntity(id: number): Promise<Quote> {
    const quote = await this.quoteRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!quote) {
      throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    }
    return quote;
  }

  private async buildItemsFromDto(
    inputs: QuoteItemInputDto[],
  ): Promise<
    Array<{
      productId: number | null;
      productName: string;
      presentation: string | null;
      cantidad: string;
      precioUnitario: string;
      subtotal: string;
      orden: number;
    }>
  > {
    const result: Array<{
      productId: number | null;
      productName: string;
      presentation: string | null;
      cantidad: string;
      precioUnitario: string;
      subtotal: string;
      orden: number;
    }> = [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const item = await this.resolveItemInput(input, i);
      result.push(item);
    }
    return result;
  }

  private async resolveItemInput(
    input: QuoteItemInputDto,
    index: number,
  ): Promise<{
    productId: number | null;
    productName: string;
    presentation: string | null;
    cantidad: string;
    precioUnitario: string;
    subtotal: string;
    orden: number;
  }> {
    let productId: number | null = null;
    let productName = input.productName?.trim() ?? '';
    let presentation = input.presentation?.trim() ?? null;
    let precioUnitario = input.precioUnitario ?? '0';

    if (input.productId) {
      const product = await this.productRepo.findOne({
        where: { id: input.productId },
      });
      if (!product) {
        throw new NotFoundException(`Producto ${input.productId} no encontrado`);
      }
      productId = product.id;
      productName = productName || product.name;
      presentation = presentation ?? product.presentation;
      if (input.precioUnitario === undefined) {
        precioUnitario = String(product.price);
      }
    }
    if (!productName) {
      throw new BadRequestException(
        `Item ${index + 1}: productName es requerido cuando no hay productId`,
      );
    }
    const cantidadNum = Number(input.cantidad);
    const precioNum = Number(precioUnitario);
    if (Number.isNaN(cantidadNum) || cantidadNum <= 0) {
      throw new BadRequestException(
        `Item ${index + 1}: cantidad debe ser mayor a 0`,
      );
    }
    if (Number.isNaN(precioNum) || precioNum < 0) {
      throw new BadRequestException(
        `Item ${index + 1}: precioUnitario inválido`,
      );
    }
    const subtotalNum = cantidadNum * precioNum;
    return {
      productId,
      productName,
      presentation,
      cantidad: cantidadNum.toFixed(2),
      precioUnitario: precioNum.toFixed(2),
      subtotal: subtotalNum.toFixed(2),
      orden: input.orden ?? index,
    };
  }

  private calcTotals(
    items: Array<{ subtotal: string }>,
    ivaPct: number,
  ): { subtotal: number; ivaMonto: number; total: number } {
    const subtotal = items.reduce((acc, it) => acc + Number(it.subtotal), 0);
    const ivaMonto = (subtotal * ivaPct) / 100;
    const total = subtotal + ivaMonto;
    return { subtotal, ivaMonto, total };
  }

  private async generateNumero(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRE-${year}-`;
    const last = await manager
      .createQueryBuilder(Quote, 'q')
      .where('q.numero LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('q.id', 'DESC')
      .getOne();
    let next = 1;
    if (last) {
      const match = last.numero.match(/PRE-\d{4}-(\d+)/);
      if (match) next = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  private async syncDealMontoTx(
    manager: EntityManager,
    dealId: number,
  ): Promise<void> {
    const aceptado = await manager.findOne(Quote, {
      where: { dealId, estado: QuoteEstado.ACEPTADO },
      order: { createdAt: 'DESC' },
    });
    const chosen =
      aceptado ??
      (await manager.findOne(Quote, {
        where: { dealId, estado: Not(QuoteEstado.RECHAZADO) },
        order: { createdAt: 'DESC' },
      }));
    await manager.update(Deal, dealId, {
      monto: chosen ? chosen.total : null,
    });
  }

  private toResponseDto(quote: Quote): QuoteResponseDto {
    const items = (quote.items ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((i) => this.toItemDto(i));
    return {
      id: quote.id,
      dealId: quote.dealId,
      numero: quote.numero,
      titulo: quote.titulo,
      subtotal: quote.subtotal,
      ivaPorcentaje: quote.ivaPorcentaje,
      ivaMonto: quote.ivaMonto,
      total: quote.total,
      estado: quote.estado,
      validoHasta: quote.validoHasta,
      formaPago: quote.formaPago,
      notas: quote.notas,
      pdfUrl: quote.pdfUrl,
      items,
      createdAt: formatDateISO(quote.createdAt) || '',
      updatedAt: formatDateISO(quote.updatedAt) || '',
    };
  }

  private toItemDto(item: QuoteItem): QuoteItemResponseDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      presentation: item.presentation,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      orden: item.orden,
    };
  }

  private async toPresupuestoData(
    quote: Quote,
    lead: Lead,
  ): Promise<PresupuestoData> {
    const logoBase64 = await this.pdfService.loadEmpresaLogoBase64();
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const productos = (quote.items ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((i) => ({
        cantidad: Number(i.cantidad),
        nombre: i.productName,
        presentacion: i.presentation || '-',
        precioUnitario: Number(i.precioUnitario),
        subtotal: Number(i.subtotal),
      }));
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
        numero: quote.numero,
        fecha,
      },
      cliente: {
        razonSocial: lead.nombre,
        telefono: lead.telefono ?? '',
        direccion: '',
        email: lead.email ?? '',
        localidad: [lead.ciudad, lead.provincia].filter(Boolean).join(', '),
      },
      productos,
      condiciones: {
        formaPago: quote.formaPago,
        validezDias: quote.validoHasta ? this.daysUntil(quote.validoHasta) : 15,
        notas: quote.notas ?? '',
      },
      totales: {
        subtotal: Number(quote.subtotal),
        ivaPorcentaje: Number(quote.ivaPorcentaje),
        ivaMonto: Number(quote.ivaMonto),
        total: Number(quote.total),
      },
    };
  }

  private daysUntil(dateString: string): number {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }
}
