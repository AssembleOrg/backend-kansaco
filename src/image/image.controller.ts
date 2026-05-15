import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ConflictException,
  Logger,
  ValidationPipe,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ProductoService } from '../product/product.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiQuery,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImageService } from './image.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';
import { Throttle } from '@nestjs/throttler';
import {
  ImageResponse,
  PaginatedImageResponse,
} from './dto/image-response.dto';
import { ListImagesQueryDto } from './dto/list-images-query.dto';

@Controller('image')
@ApiTags('Kansaco - Images')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor(
    private readonly imageService: ImageService,
    @Inject(forwardRef(() => ProductoService))
    private readonly productoService: ProductoService,
  ) {}

  @Post('upload')
  @Throttle({ short: { ttl: 2000, limit: 3 }, medium: { ttl: 60000, limit: 20 } })
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(RolesGuard)
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
        folder: {
          type: 'string',
          description: 'Optional folder path (e.g., "products")',
        },
      },
    },
  })
  @ApiOkResponse({ type: ImageResponse })
  @ApiOperation({ summary: 'Upload a single image' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<ImageResponse> {
    return this.imageService.uploadImage(file, folder);
  }

  @Post('upload-multiple')
  @Throttle({ short: { ttl: 5000, limit: 2 }, medium: { ttl: 60000, limit: 10 } })
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image files to upload (max 20)',
        },
        folder: {
          type: 'string',
          description: 'Optional folder path (e.g., "products")',
        },
      },
    },
  })
  @ApiOkResponse({ type: [ImageResponse] })
  @ApiOperation({ summary: 'Upload multiple images at once' })
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ): Promise<ImageResponse[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    return this.imageService.uploadMultipleImages(files, folder);
  }

  @Get('list')
  @ApiOkResponse({ type: PaginatedImageResponse })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Page number (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Number of images per page (max 1000, default 20)',
  })
  @ApiQuery({
    name: 'prefix',
    type: String,
    description: 'Filter by prefix (folder path)',
  })
  @ApiQuery({
    name: 'continuationToken',
    type: String,
    description: 'Continuation token for pagination',
  })
  @ApiOperation({
    summary: 'List all images with pagination (WordPress-style gallery)',
    description:
      'Returns a paginated list of all images in the bucket. Use continuationToken for efficient pagination.',
  })
  async listImages(
    @Query(ValidationPipe) query: ListImagesQueryDto,
  ): Promise<PaginatedImageResponse> {
    return this.imageService.listImages(query);
  }

  @Get(':key')
  @ApiOkResponse({ type: ImageResponse })
  @ApiOperation({ summary: 'Get image URL by key' })
  async getImageUrl(@Param('key') key: string): Promise<{ url: string }> {
    const url = await this.imageService.getImageUrl(key);
    return { url };
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @UseGuards(RolesGuard)
  @ApiOkResponse()
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description:
      'If true, deletes the image from the bucket even if it is still referenced by one or more products. All references will be removed (cascade). Default: false.',
  })
  @ApiOperation({
    summary: 'Delete an image by key',
    description:
      'By default, if the image is still referenced by any product, this endpoint returns 409 Conflict listing the affected product IDs. Pass ?force=true to override and cascade the deletion across all referencing products.',
  })
  async deleteImage(
    @Param('key') key: string,
    @Query('force') force?: string,
  ): Promise<{ message: string }> {
    const isForced = force === 'true' || force === '1';

    if (!isForced) {
      const productIds =
        await this.productoService.getProductIdsUsingImageKey(key);
      if (productIds.length > 0) {
        throw new ConflictException({
          message:
            'Image is in use by one or more products. Pass ?force=true to delete anyway (this will remove the image from those products too).',
          imageKey: key,
          inUseByProductIds: productIds,
        });
      }
    }

    await this.imageService.deleteImage(key);
    return {
      message: isForced
        ? 'Image deleted (forced). References in products were also removed.'
        : 'Image deleted successfully',
    };
  }
}

