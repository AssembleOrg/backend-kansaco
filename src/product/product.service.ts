import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
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
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
  ) {}

  private applyFilters(
    qb: any,
    filters: Partial<Product>,
  ): void {
    Object.entries(filters).forEach(([key, value]) => {
      // Ignorar campos de paginación y valores vacíos
      if (!value || key === 'page' || key === 'limit') {
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
      } else if (key === 'stock' || key === 'isVisible' || key === 'isFeatured') {
        // Para campos numéricos y booleanos, usar igualdad exacta
        qb.andWhere(`product.${key} = :${paramName}`, {
          [paramName]: value,
        });
      } else {
        // Para campos de texto, usar LOWER() para búsqueda case-insensitive
        qb.andWhere(`LOWER(product.${key}) LIKE LOWER(:${paramName})`, {
          [paramName]: `%${value}%`,
        });
      }
    });
  }

  async getAllProducts(
    page: number = 1,
    limit: number = 20,
    filters?: Partial<Product>,
  ): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Si hay filtros, usar QueryBuilder
    if (filters && Object.keys(filters).length > 0) {
      const qb = this.productRepository
        .createQueryBuilder('product')
        .orderBy('product.id', 'ASC');

      this.applyFilters(qb, filters);

      const [products, total] = await qb
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data: products,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    }

    // Sin filtros, usar método simple
    const [products, total] = await this.productRepository.findAndCount({
      order: {
        id: 'ASC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getFilteredProducts(filters: Partial<Product>): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.id', 'ASC');

    this.applyFilters(qb, filters);

    return await qb.getMany();
  }

  async getProduct(id: number): Promise<Product> {
    return this.productRepository.findOne({
      where: {
        id,
      },
      relations: ['images'],
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

  async addImageToProduct(
    productId: number,
    imageUrl: string,
    imageKey: string,
    isPrimary: boolean = false,
  ): Promise<ProductImage> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException(`Product with id: ${productId} not found`);
    }

    // Si esta imagen es principal, quitar la principal anterior
    if (isPrimary) {
      await this.productImageRepository.update(
        { productId, isPrimary: true },
        { isPrimary: false },
      );
    }

    // Obtener el máximo orden actual para este producto
    const maxOrder = await this.productImageRepository
      .createQueryBuilder('image')
      .where('image.productId = :productId', { productId })
      .select('MAX(image.order)', 'max')
      .getRawOne();

    const newOrder = maxOrder?.max !== null ? maxOrder.max + 1 : 0;

    const productImage = this.productImageRepository.create({
      productId,
      imageUrl,
      imageKey,
      order: newOrder,
      isPrimary,
    });

    return await this.productImageRepository.save(productImage);
  }

  async getProductImages(productId: number): Promise<ProductImage[]> {
    return await this.productImageRepository.find({
      where: { productId },
      order: { order: 'ASC', id: 'ASC' },
    });
  }

  async deleteProductImage(imageId: number): Promise<void> {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId },
    });

    if (!image) {
      throw new BadRequestException(`Image with id: ${imageId} not found`);
    }

    await this.productImageRepository.remove(image);
  }

  async setPrimaryImage(imageId: number): Promise<ProductImage> {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId },
      relations: ['product'],
    });

    if (!image) {
      throw new BadRequestException(`Image with id: ${imageId} not found`);
    }

    // Quitar la principal anterior del mismo producto
    await this.productImageRepository.update(
      { productId: image.productId, isPrimary: true },
      { isPrimary: false },
    );

    // Establecer esta como principal
    image.isPrimary = true;
    return await this.productImageRepository.save(image);
  }

  async reorderProductImages(
    productId: number,
    imageIds: number[],
  ): Promise<void> {
    // Eliminar duplicados del array
    const uniqueImageIds = [...new Set(imageIds)];

    this.logger.debug(
      `Reorder request for product ${productId} with ${uniqueImageIds.length} unique image IDs: ${uniqueImageIds.join(', ')}`,
    );

    // Validar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException(`Product with id: ${productId} not found`);
    }

    // Obtener todas las imágenes del producto
    const allProductImages = await this.productImageRepository.find({
      where: { productId },
    });

    this.logger.debug(
      `Product ${productId} has ${allProductImages.length} images: ${allProductImages.map((img) => img.id).join(', ')}`,
    );

    // Si no hay imágenes, no hay nada que reordenar
    if (allProductImages.length === 0) {
      throw new BadRequestException(
        `Product ${productId} has no images to reorder`,
      );
    }

    // Validar que todas las imágenes solicitadas pertenezcan al producto
    const productImageIds = allProductImages.map((img) => img.id);
    const invalidIds = uniqueImageIds.filter(
      (id) => !productImageIds.includes(id),
    );

    if (invalidIds.length > 0) {
      // Verificar si están enviando índices en lugar de IDs
      const maxIndex = allProductImages.length - 1;
      const looksLikeIndices = invalidIds.every(
        (id) => id >= 0 && id <= maxIndex,
      );

      let errorMessage = `Some images do not belong to this product. Invalid IDs: ${invalidIds.join(', ')}. Valid IDs: ${productImageIds.join(', ')}`;

      if (looksLikeIndices) {
        errorMessage += `\n\n⚠️  It looks like you're sending array indices (${invalidIds.join(', ')}) instead of image IDs. Please send the actual image IDs from the product.`;
      }

      this.logger.error(
        `Invalid image IDs for product ${productId}: ${invalidIds.join(', ')}. Valid IDs: ${productImageIds.join(', ')}`,
      );
      throw new BadRequestException(errorMessage);
    }

    // Validar que se están reordenando todas las imágenes del producto
    // Permitimos reordenar solo un subconjunto, pero logueamos si no son todas
    if (uniqueImageIds.length !== productImageIds.length) {
      this.logger.warn(
        `Reorder request for product ${productId} has ${uniqueImageIds.length} images, but product has ${productImageIds.length} images. Reordering only the provided images.`,
      );
    }

    // Actualizar el orden
    for (let i = 0; i < uniqueImageIds.length; i++) {
      await this.productImageRepository.update(
        { id: uniqueImageIds[i] },
        { order: i },
      );
    }

    this.logger.debug(
      `Successfully reordered ${uniqueImageIds.length} images for product ${productId}`,
    );
  }
}
