import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DigitalOceanService } from '../extraServices/digitalOcean.service';
import { PaginatedImageResponse, ImageResponse } from './dto/image-response.dto';
import { ListImagesQueryDto } from './dto/list-images-query.dto';
import * as path from 'path';
const sharp = require('sharp');

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(private readonly digitalOceanService: DigitalOceanService) {}

  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validar que sea una imagen
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed.',
      );
    }

    // Usar el nombre original del archivo pero cambiar extensión a .webp
    // Limpiar el nombre para evitar caracteres problemáticos
    const originalName = file.originalname;
    const nameWithoutExt = path.parse(originalName).name;
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales con _
      .replace(/_{2,}/g, '_') // Reemplazar múltiples _ con uno solo
      .toLowerCase();
    
    // Siempre usar extensión .webp
    const finalFileName = `${sanitizedName}.webp`;
    
    // Guardar directamente en la raíz del bucket, sin subcarpetas
    // Si se especifica una carpeta, usarla, pero sin anidamiento
    const key = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/${finalFileName}` : finalFileName;

    try {
      // Convertir la imagen a WebP con optimización
      // Calidad 85 es un buen balance entre calidad y tamaño
      // Redimensionar si es muy grande (opcional, puedes ajustar el maxWidth)
      const webpBuffer = await sharp(file.buffer)
        .webp({ quality: 85, effort: 6 }) // effort: 6 es un buen balance entre velocidad y compresión
        .toBuffer();

      this.logger.debug(
        `Image converted: ${file.originalname} (${file.size} bytes) -> ${finalFileName} (${webpBuffer.length} bytes) - ${Math.round((1 - webpBuffer.length / file.size) * 100)}% reduction`,
      );

      await this.digitalOceanService.uploadFile(key, webpBuffer);

      const url = this.digitalOceanService.getFileUrl(key);

      return {
        key,
        url,
        size: webpBuffer.length, // Tamaño del archivo WebP convertido
        lastModified: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error uploading image: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<ImageResponse[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async listImages(
    query: ListImagesQueryDto,
  ): Promise<PaginatedImageResponse> {
    const { page = 1, limit = 20, prefix, continuationToken } = query;

    // Digital Ocean Spaces usa continuation tokens, no páginas tradicionales
    // Si hay un continuationToken, lo usamos directamente
    // Si no, calculamos cuántos objetos necesitamos "saltar" basado en la página
    let maxKeys = limit;
    let token = continuationToken;

    // Si no hay token pero la página es > 1, necesitamos hacer múltiples requests
    // Para simplificar, usamos el token si está disponible, sino empezamos desde el inicio
    if (!token && page > 1) {
      // Para páginas > 1 sin token, necesitaríamos hacer requests iterativos
      // Por ahora, solo soportamos página 1 o usar tokens directamente
      this.logger.warn(
        `Page ${page} requested without continuation token. Returning first page.`,
      );
    }

    // Listar desde la raíz del bucket por defecto (sin prefijo)
    // Si se especifica un prefijo, usarlo para filtrar
    const searchPrefix = prefix !== undefined && prefix !== '' ? prefix : undefined;
    
    // Si hay prefijo, asegurar que termine con / si no está vacío
    const cleanPrefix = searchPrefix && !searchPrefix.endsWith('/') 
      ? `${searchPrefix}/` 
      : searchPrefix;

    try {
      const result = await this.digitalOceanService.listObjects(
        cleanPrefix,
        maxKeys,
        token,
      );

      return {
        images: result.objects,
        total: result.objects.length, // Digital Ocean no proporciona total exacto sin listar todo
        page: token ? page : 1,
        limit: maxKeys,
        hasMore: result.isTruncated,
        nextToken: result.nextContinuationToken,
      };
    } catch (error) {
      this.logger.error(
        `Error listing images: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to list images');
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      await this.digitalOceanService.deleteFile(key);
    } catch (error) {
      this.logger.error(`Error deleting image: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete image');
    }
  }

  async getImageUrl(key: string): Promise<string> {
    return this.digitalOceanService.getFileUrl(key);
  }

  async imageExists(key: string): Promise<boolean> {
    return this.digitalOceanService.fileExists(key);
  }
}

