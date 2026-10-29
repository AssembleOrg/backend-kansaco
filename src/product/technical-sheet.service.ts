import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Product } from './product.entity';
import { DigitalOceanService } from '../extraServices/digitalOcean.service';

export const TECHNICAL_SHEET_MAX_BYTES = 20 * 1024 * 1024;
const FOLDER = 'fichas-tecnicas';

export interface TechnicalSheetInfo {
  name: string;
  size: number | null;
}

export interface TechnicalSheetFile {
  name: string;
  buffer: Buffer;
}

/** `%PDF-` al principio: el mimetype lo manda el navegador y no alcanza. */
export function isPdfBuffer(buffer: Buffer | undefined): boolean {
  return (
    !!buffer &&
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('latin1') === '%PDF-'
  );
}

/**
 * Nombre visible del archivo: el original sin caracteres de control ni
 * separadores de ruta, con extensión .pdf y a lo sumo 200 caracteres
 * (largo de la columna).
 */
export function cleanSheetName(originalName: string | undefined): string {
  // multer entrega el nombre en latin1 aunque venga en UTF-8.
  let name = originalName ? Buffer.from(originalName, 'latin1').toString('utf8') : '';
  if (name.includes('�')) name = originalName ?? '';
  name = path
    .basename(name.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f"]/g, '')
    .trim();
  const base = name.replace(/\.pdf$/i, '').trim() || 'ficha-tecnica';
  return `${base.slice(0, 196)}.pdf`;
}

/** Key del bucket: único por subida, sólo ASCII seguro. */
export function buildSheetKey(productId: number, name: string): string {
  const slug =
    name
      .replace(/\.pdf$/i, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'ficha';
  return `${FOLDER}/${productId}-${Date.now()}-${slug}.pdf`;
}

@Injectable()
export class TechnicalSheetService {
  private readonly logger = new Logger(TechnicalSheetService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly digitalOceanService: DigitalOceanService,
  ) {}

  private async findWithKey(productId: number) {
    const product = await this.productRepository
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.isVisible',
        'p.technicalSheetName',
        'p.technicalSheetSize',
      ])
      .addSelect('p.technicalSheetKey')
      .where('p.id = :id', { id: productId })
      .getOne();
    if (!product) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }
    return product;
  }

  async upload(
    productId: number,
    file: Express.Multer.File | undefined,
  ): Promise<TechnicalSheetInfo> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (file.size > TECHNICAL_SHEET_MAX_BYTES) {
      throw new BadRequestException('El PDF no puede superar los 20 MB');
    }
    if (!isPdfBuffer(file.buffer)) {
      throw new BadRequestException('El archivo tiene que ser un PDF');
    }

    const product = await this.findWithKey(productId);
    const name = cleanSheetName(file.originalname);
    const key = buildSheetKey(productId, name);

    await this.digitalOceanService.uploadFile(key, file.buffer, 'application/pdf', {
      private: true,
    });

    try {
      await this.productRepository.update(productId, {
        technicalSheetKey: key,
        technicalSheetName: name,
        technicalSheetSize: file.size,
      });
    } catch (error) {
      // Sin la referencia en la base el archivo queda huérfano: borrarlo.
      await this.removeFromBucket(key);
      throw error;
    }

    if (product.technicalSheetKey && product.technicalSheetKey !== key) {
      await this.removeFromBucket(product.technicalSheetKey);
    }

    return { name, size: file.size };
  }

  async remove(productId: number): Promise<void> {
    const product = await this.findWithKey(productId);
    if (!product.technicalSheetKey) {
      throw new NotFoundException('El producto no tiene ficha técnica');
    }
    await this.productRepository.update(productId, {
      technicalSheetKey: null,
      technicalSheetName: null,
      technicalSheetSize: null,
    });
    await this.removeFromBucket(product.technicalSheetKey);
  }

  /** Lo usa el borrado de producto: la fila ya no existe, sólo queda el archivo. */
  async getKey(productId: number): Promise<string | null> {
    const product = await this.productRepository
      .createQueryBuilder('p')
      .select('p.id')
      .addSelect('p.technicalSheetKey')
      .where('p.id = :id', { id: productId })
      .getOne();
    return product?.technicalSheetKey ?? null;
  }

  async get(productId: number, isStaff: boolean): Promise<TechnicalSheetFile> {
    const product = await this.findWithKey(productId);
    // Un producto oculto no existe para el cliente (tampoco su ficha).
    if (!product.technicalSheetKey || (!product.isVisible && !isStaff)) {
      throw new NotFoundException('El producto no tiene ficha técnica');
    }
    let buffer: Buffer;
    try {
      buffer = await this.digitalOceanService.getFile(product.technicalSheetKey);
    } catch {
      throw new NotFoundException('No se encontró el archivo de la ficha técnica');
    }
    return {
      name: product.technicalSheetName || 'ficha-tecnica.pdf',
      buffer,
    };
  }

  async removeFromBucket(key: string): Promise<void> {
    try {
      await this.digitalOceanService.deleteFile(key);
    } catch (error) {
      // No cortar la operación: un archivo huérfano en el bucket no rompe nada.
      this.logger.error(`No se pudo borrar ${key} del bucket: ${error.message}`);
    }
  }
}
