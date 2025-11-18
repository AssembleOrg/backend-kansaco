import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { In, Repository } from 'typeorm';
import {
  addSlug,
  parseCsv,
  parseXlsx,
  parseXml,
  toCsv,
  toXlsx,
  toXml,
} from 'src/helpers/product.helper';
import { formatDateSpanish, now } from 'src/helpers/date.helper';

export type ExportFormat = 'csv' | 'xml' | 'xlsx';

@Injectable()
export class ProductoService {
  protected logger = new Logger('ProductoService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getAllProducts(): Promise<Product[]> {
    // const products = await this.productRepository.find();
    // for (const p of products) {
    //   const name = p.name;
    //   const slug = name
    //     .normalize('NFD') // Split accented letters into base + diacritic
    //     .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    //     .replace(/[' ', '/', '•']/g, '-') // Replace unwanted characters with '-'
    //     .replace(/-+/g, '-') // Replace multiple hyphens with a single one
    //     .toLowerCase()
    //     .replace(/^-+|-+$/g, ''); // Optionally trim leading/trailing hyphens
    //   this.logger.debug(`Updating ${p.name} with slug ${slug}`);
    //   await this.productRepository.update(p.id, {
    //     slug,
    //   });
    // }

    return await this.productRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async getFilteredProducts(filters: Partial<Product>): Promise<Product[]> {
    const qb = this.productRepository.createQueryBuilder('product');

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      if (!this.productRepository.metadata.hasColumnWithPropertyPath(key)) {
        throw new BadRequestException(
          `El nombre de la columna no existe: ${key}`,
        );
      }
      const paramName = `filter_${key}`;

      if (key === 'category') {
        const categories = Array.isArray(value) ? value : [value];
        qb.andWhere(`product.category && ARRAY[:...${paramName}]::text[]`, {
          [paramName]: categories,
        });
      } else {
        qb.andWhere(`product.${key} LIKE :${paramName}`, {
          [paramName]: `%${value}%`,
        });
      }
    });

    return await qb.getMany();
  }

  async getProduct(id: number): Promise<Product> {
    return this.productRepository.findOne({
      where: {
        id,
      },
    });
  }

  async editProduct(id: number, body: Partial<Product>): Promise<Product> {
    const hasNameChange = body.name !== undefined;

    const finalBody = hasNameChange ? addSlug(body) : body;

    const product = await this.productRepository.preload({
      id,
      ...finalBody,
    });

    if (!product) {
      throw new BadRequestException(`Product with id: ${id} not found`);
    }

    return await this.productRepository.save(product);
  }

  async createProduct(body: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(addSlug(body));

    return await this.productRepository.save(product);
  }

  async deleteProduct(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
      },
    });

    if (!product) {
      throw new BadRequestException(`Product with id: ${id} not found`);
    }

    return await this.productRepository.remove(product);
  }

  async getListProductsToUpdatePrices(formatOutput: string): Promise<{
    buffer: Buffer;
    contentType: string;
    extension: string;
    fileName: string;
  }> {
    const products = await this.productRepository.find({
      select: ['id', 'name', 'price'],
    });
    this.logger.log('Cantidad de productos: ' + products.length);
    const fileName = `productos-al-${formatDateSpanish(now())}`;

    switch (formatOutput) {
      case 'csv':
        const file = toCsv(products);

        return {
          buffer: file,
          contentType: 'text/csv',
          extension: 'csv',
          fileName,
        };
      case 'xml':
        const fileXml = toXml(products);
        return {
          buffer: fileXml,
          contentType: 'application/xml',
          extension: 'xml',
          fileName,
        };
      case 'xlsx':
        const fileXlsx = await toXlsx(products);
        return {
          buffer: fileXlsx,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: 'xlsx',
          fileName,
        };
      default:
        throw new BadRequestException('Format Unnacepted');
    }
  }

  async updatePrices(file: Express.Multer.File): Promise<Product[]> {
    // 1) detect extension
    const ext = file.originalname.split('.').pop().toLowerCase();
    this.logger.debug(`Detected file extension: ${ext}`);
    let updates: Partial<Product>[];
    switch (ext) {
      case 'csv':
        updates = await parseCsv(file.buffer.toString('utf8'));
        break;
      case 'xml':
        updates = await parseXml(file.buffer);
        break;
      case 'xlsx':
        updates = await parseXlsx(file.buffer);
        break;
      default:
        throw new BadRequestException('Unsupported file format');
    }

    if (!updates.length) {
      throw new BadRequestException('File contains no rows');
    }

    this.logger.debug('File contains', updates.length, 'rows');
    this.logger.debug('First row:', updates[0]);

    // 2) filter valid numeric ids
    const validUpdates = updates.filter(
      (u) => Number.isInteger(u.id) && !isNaN(u.price),
    );
    this.logger.debug(`Found ${validUpdates.length} valid updates`);
    if (!validUpdates.length) {
      throw new BadRequestException('No valid id/price rows found');
    }
    this.logger.debug('Valid updates found:', validUpdates.length);

    const ids = validUpdates.map((u) => u.id);

    const existingProds = await this.productRepository.find({
      where: { id: In(ids) },
      select: ['id', 'price'],
    });

    this.logger.debug('Found', existingProds.length, 'existing products');

    const priceMap = new Map<number, number>(
      existingProds.map((p) => [p.id, p.price]),
    );

    this.logger.debug('Price map:', priceMap.size);

    const changed = validUpdates.filter(
      ({ id, price }) => priceMap.get(id) !== price,
    );

    if (changed.length === 0) {
      // nothing to do!
      throw new BadRequestException('No changes to apply');
    }

    for (const { id, price } of changed) {
      await this.productRepository.update(id, { price });
    }

    // 5) Reload just the changed products with full data
    const refreshed = await this.productRepository.find({
      where: { id: In(changed.map((u) => u.id)) },
    });

    return refreshed;
  }
}
