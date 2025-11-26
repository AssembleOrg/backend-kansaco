import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
  Res,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductoService } from './product.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { ProductGet } from './dto/productGet.dto';
import { ProductGetPaginated } from './dto/productGetPaginated.dto';
import { ProductResponse } from './dto/productResponse.dto';
import { PaginatedResponse } from './dto/pagination.dto';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/user/user.enum';
import { ProductEdit } from './dto/productEdit.dto';
import { ProductCreate } from './dto/productCreate.dto';
import { ProductImageResponse } from './dto/product-image-response.dto';
import { formatDateISO } from '../helpers/date.helper';
import { AssociateImageDto } from './dto/associate-image.dto';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImageService } from '../image/image.service';

@Controller('product')
@ApiTags('Kansaco - Products')
export class ProductoController {
  protected logger = new Logger('ProductController');

  /**
   * Helper para convertir ProductImage a ProductImageResponse
   * Convierte DateTime a string ISO en GMT-3
   */
  private toProductImageResponse(img: any): ProductImageResponse {
    return {
      id: img.id,
      productId: img.productId,
      imageUrl: img.imageUrl,
      imageKey: img.imageKey,
      order: img.order,
      isPrimary: img.isPrimary,
      createdAt: formatDateISO(img.createdAt),
    };
  }
  constructor(
    private readonly productoService: ProductoService,
    private readonly imageService: ImageService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Paginated list of products with optional filters' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of products per page (max 100, default 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'name',
    type: String,
    required: false,
    description: 'Filter by product name',
  })
  @ApiQuery({
    name: 'slug',
    type: String,
    required: false,
    description: 'Filter by product slug',
  })
  @ApiQuery({
    name: 'category',
    type: [String],
    required: false,
    description: 'Filter by category (can be repeated: ?category=cat1&category=cat2)',
  })
  @ApiQuery({
    name: 'sku',
    type: String,
    required: false,
    description: 'Filter by product SKU',
  })
  @ApiQuery({
    name: 'stock',
    type: Number,
    required: false,
    description: 'Filter by exact stock value',
  })
  @ApiQuery({
    name: 'wholeSaler',
    type: String,
    required: false,
    description: 'Filter by wholesaler',
  })
  @ApiQuery({
    name: 'isVisible',
    type: Boolean,
    required: false,
    description: 'Filter by visibility (true/false)',
  })
  @ApiExtraModels(ProductGetPaginated)
  async getAllProducts(
    @Query(ValidationPipe) query: ProductGetPaginated,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const { page = 1, limit = 20, ...filters } = query;
    
    // Limpiar filtros vacíos
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );

    const result = await this.productoService.getAllProducts(
      page,
      limit,
      Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
    );
    
    return {
      ...result,
      data: result.data.map((product) =>
        plainToInstance(ProductResponse, product),
      ),
    };
  }

  @Get('/filter')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [ProductResponse] })
  @ApiQuery({
    name: 'name',
    type: String,
    required: false,
    description: 'Product Name',
  })
  @ApiQuery({
    name: 'category',
    type: [String],
    required: false,
    description: 'Product Category (can be repeated)',
  })
  @ApiQuery({
    name: 'sku',
    type: String,
    required: false,
    description: 'Product SKU',
  })
  @ApiQuery({
    name: 'stock',
    type: Number,
    required: false,
    description: 'Product Stock',
  })
  @ApiQuery({
    name: 'wholeSaler',
    type: String,
    required: false,
    description: 'Product WholeSaler',
  })
  @ApiQuery({
    name: 'isVisible',
    type: Boolean,
    required: false,
    description: 'Product IsVisible',
  })
  @ApiQuery({
    name: 'slug',
    type: String,
    required: false,
    description: 'Product Slug',
  })
  @ApiExtraModels(ProductGet)
  async getFilteredProducts(
    @Query(ValidationPipe) query: ProductGet,
  ): Promise<ProductResponse[]> {
    const filteredProducts = await this.productoService.getFilteredProducts({
      ...query,
      category: query.category ? [].concat(query.category) : undefined,
    });
    return filteredProducts.length > 0
      ? filteredProducts.map((product) =>
          plainToInstance(ProductResponse, product),
        )
      : [];
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProductResponse })
  async getProduct(@Param('id') id: number): Promise<ProductResponse> {
    const product = await this.productoService.getProduct(id);
    const images = await this.productoService.getProductImages(id);
    const response = plainToInstance(ProductResponse, product);
    response.images = images.map((img) => this.toProductImageResponse(img));
    return response;
  }

  @Put('/:id/edit')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse()
  async editProduct(
    @Param('id') id: number,
    @Body(ValidationPipe) body: ProductEdit,
  ): Promise<ProductResponse> {
    const product = await this.productoService.editProduct(id, body);
    return plainToInstance(ProductResponse, product);
  }

  @Post('/create')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProductResponse })
  async createProduct(
    @Body(ValidationPipe) body: ProductCreate,
  ): Promise<ProductResponse> {
    const product = await this.productoService.createProduct(body);
    return plainToInstance(ProductResponse, product);
  }

  @Delete('/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse()
  async deleteProduct(@Param('id') id: number): Promise<ProductResponse> {
    const product = await this.productoService.deleteProduct(id);
    return plainToInstance(ProductResponse, product);
  }

  @Get('/file/listUpdatePrices')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProductResponse })
  async getListProductsToUpdatePrices(
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug('Started file generation'); // ← now this works!
    const file =
      await this.productoService.getListProductsToUpdatePrices(format);

    this.logger.debug('Ended file generation'); // ← and this too

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.fileName}.${file.extension}"`,
      'Content-Length': file.buffer.length,
    });
    this.logger.debug('Ended set headers'); // ← and this too
    res.send(file.buffer);
  }

  @Patch('file/updatePrices')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV, XML, or XLSX file with columns id and price',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 6 * 1024 * 1024 }, // 6MB max
    }),
  )
  @ApiOkResponse({ type: ProductResponse, isArray: true })
  async updatePrices(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProductResponse[]> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const products = await this.productoService.updatePrices(file);
    return products.map((product) => {
      const response = plainToInstance(ProductResponse, product);
      if (product.images) {
        response.images = product.images.map((img) => this.toProductImageResponse(img));
      }
      return response;
    });
  }

  @Post('/:id/image')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        isPrimary: {
          type: 'boolean',
          description: 'Set as primary image (default: false)',
        },
      },
    },
  })
  @ApiOkResponse({ type: ProductImageResponse })
  @ApiQuery({
    name: 'isPrimary',
    type: Boolean,
    required: false,
    description: 'Set as primary image',
  })
  async uploadProductImage(
    @Param('id') productId: number,
    @UploadedFile() file: Express.Multer.File,
    @Query('isPrimary') isPrimary?: string,
  ): Promise<ProductImageResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Subir imagen a Digital Ocean
    const imageResult = await this.imageService.uploadImage(
      file,
      'products',
    );

    // Guardar referencia en la base de datos
    const isPrimaryBool = isPrimary === 'true' || isPrimary === '1';
    const productImage = await this.productoService.addImageToProduct(
      productId,
      imageResult.url,
      imageResult.key,
      isPrimaryBool,
    );

    return this.toProductImageResponse(productImage);
  }

  @Get('/:id/images')
  @ApiOkResponse({ type: [ProductImageResponse] })
  @ApiOperation({ summary: 'Get all images for a product (Public)' })
  async getProductImages(
    @Param('id') productId: number,
  ): Promise<ProductImageResponse[]> {
    const images = await this.productoService.getProductImages(productId);
    return images.map((image) => this.toProductImageResponse(image));
  }

  @Post('/:id/image/associate')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProductImageResponse })
  @ApiOperation({
    summary: 'Associate an existing image from Digital Ocean Spaces to a product',
    description:
      'Associates an image that already exists in Digital Ocean Spaces to a product without re-uploading it.',
  })
  @ApiQuery({
    name: 'isPrimary',
    type: Boolean,
    required: false,
    description: 'Set as primary image (default: false)',
  })
  async associateImageToProduct(
    @Param('id') productId: number,
    @Body(ValidationPipe) body: AssociateImageDto,
    @Query('isPrimary') isPrimary?: string,
  ): Promise<ProductImageResponse> {
    const { imageKey } = body;

    if (!imageKey || imageKey.trim() === '') {
      throw new BadRequestException('imageKey is required');
    }

    // Limpiar el imageKey (remover barras iniciales si las hay)
    const cleanKey = imageKey.trim().replace(/^\/+/, '');

    // Intentar encontrar la imagen en diferentes ubicaciones posibles
    // 1. Tal cual viene (raíz o con prefijo)
    // 2. En la carpeta products/ si no tiene prefijo
    // 3. En la raíz si tiene prefijo products/
    const possibleKeys = [
      cleanKey,
      cleanKey.startsWith('products/') ? cleanKey.replace('products/', '') : `products/${cleanKey}`,
    ];

    // Eliminar duplicados
    const uniqueKeys = [...new Set(possibleKeys)];

    this.logger.debug(
      `Checking if image exists in bucket. Trying keys: ${uniqueKeys.join(', ')}`,
    );

    let foundKey: string | null = null;
    for (const key of uniqueKeys) {
      const exists = await this.imageService.imageExists(key);
      if (exists) {
        foundKey = key;
        this.logger.debug(`Image found at: ${key}`);
        break;
      }
    }

    if (!foundKey) {
      this.logger.error(
        `Image not found in Digital Ocean Spaces. Tried keys: ${uniqueKeys.join(', ')}`,
      );
      throw new BadRequestException(
        `Image not found in Digital Ocean Spaces: ${imageKey}. Tried locations: ${uniqueKeys.join(', ')}. Please make sure the image exists in the bucket before associating it to a product.`,
      );
    }

    this.logger.debug(
      `Image exists in bucket at: ${foundKey}. Proceeding to associate with product ${productId}`,
    );

    // Obtener la URL de la imagen desde Digital Ocean Spaces usando el key encontrado
    const imageUrl = await this.imageService.getImageUrl(foundKey);

    // Convertir isPrimary de string a boolean
    const isPrimaryBool = isPrimary === 'true' || isPrimary === '1';

    // IMPORTANTE: Guardar el key encontrado (no el original) para mantener consistencia
    // Asociar la imagen al producto (SOLO crea el registro en BD, NO toca el bucket)
    const productImage = await this.productoService.addImageToProduct(
      productId,
      imageUrl,
      foundKey, // Usar el key encontrado, no el original
      isPrimaryBool,
    );

    this.logger.debug(
      `Successfully associated image ${foundKey} to product ${productId}. Image ID: ${productImage.id}`,
    );

    return plainToInstance(ProductImageResponse, productImage);
  }

  @Delete('/:id/image/:imageId')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse()
  async deleteProductImage(
    @Param('id') productId: number,
    @Param('imageId') imageId: number,
  ): Promise<{ message: string }> {
    // Obtener la imagen para eliminar del bucket
    const images = await this.productoService.getProductImages(productId);
    const image = images.find((img) => img.id === imageId);

    if (!image) {
      throw new BadRequestException(
        `Image with id: ${imageId} not found for product ${productId}`,
      );
    }

    // Eliminar del bucket
    try {
      await this.imageService.deleteImage(image.imageKey);
    } catch (error) {
      this.logger.warn(
        `Failed to delete image from bucket: ${error.message}`,
      );
    }

    // Eliminar de la base de datos
    await this.productoService.deleteProductImage(imageId);

    return { message: 'Image deleted successfully' };
  }

  @Patch('/:id/image/:imageId/primary')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProductImageResponse })
  async setPrimaryImage(
    @Param('id') productId: number,
    @Param('imageId') imageId: number,
  ): Promise<ProductImageResponse> {
    const image = await this.productoService.setPrimaryImage(imageId);
    return this.toProductImageResponse(image);
  }

  @Patch('/:id/images/reorder')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of image IDs in the desired order',
        },
      },
      required: ['imageIds'],
    },
  })
  @ApiOkResponse()
  async reorderProductImages(
    @Param('id') productId: number,
    @Body('imageIds') imageIds: any,
  ): Promise<{ message: string }> {
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new BadRequestException('imageIds must be a non-empty array');
    }

    // Convertir todos los IDs a números explícitamente
    const numericImageIds = imageIds.map((id) => {
      const numId = Number(id);
      if (isNaN(numId)) {
        throw new BadRequestException(
          `Invalid image ID: ${id}. All IDs must be numbers.`,
        );
      }
      return numId;
    });

    this.logger.debug(
      `Reordering images for product ${productId}: ${numericImageIds.join(', ')}`,
    );

    await this.productoService.reorderProductImages(productId, numericImageIds);
    return { message: 'Images reordered successfully' };
  }
}
