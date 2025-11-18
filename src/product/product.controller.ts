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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductoService } from './product.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { ProductGet } from './dto/productGet.dto';
import { ProductResponse } from './dto/productResponse.dto';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/user/user.enum';
import { ProductEdit } from './dto/productEdit.dto';
import { ProductCreate } from './dto/productCreate.dto';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('product')
@ApiTags('Kansaco - Products')
export class ProductoController {
  protected logger = new Logger('ProductController');
  constructor(private readonly productoService: ProductoService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOkResponse()
  async getAllProducts() {
    return this.productoService.getAllProducts();
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
    return plainToInstance(ProductResponse, product);
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
    return this.productoService.updatePrices(file);
  }
}
