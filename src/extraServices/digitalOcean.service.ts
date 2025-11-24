import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';

@Injectable()
export class DigitalOceanService {
  private s3: S3;
  private bucketName = 'kansaco-images';
  private logger = new Logger('DigitalOceanService');
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    const do_access_key = this.configService.get<string>(
      'digitalOcean.do_access_key',
    );
    const do_secret_key = this.configService.get<string>(
      'digitalOcean.do_secret_key',
    );
    const do_spaces_endpoint = this.configService.get<string>(
      'digitalOcean.do_spaces_endpoint',
    );
    const do_region = this.configService.get<string>('digitalOcean.do_region');
    const do_url = this.configService.get<string>('digitalOcean.do_url');

    // Validar que las variables requeridas estén configuradas
    if (!do_access_key || !do_secret_key || !do_spaces_endpoint || !do_region) {
      this.logger.warn(
        'Digital Ocean configuration is incomplete. Some features may not work.',
      );
      this.logger.debug(
        `Config status: access_key=${!!do_access_key}, secret_key=${!!do_secret_key}, endpoint=${!!do_spaces_endpoint}, region=${!!do_region}`,
      );
    }

    // Configurar el cliente S3 para Digital Ocean Spaces
    // IMPORTANTE: El endpoint debe ser solo la región, sin el bucket name
    // Ejemplo correcto: https://nyc3.digitaloceanspaces.com
    // Ejemplo incorrecto: https://kansaco-images.nyc3.digitaloceanspaces.com
    
    // Validar y limpiar el endpoint
    // El endpoint debe ser: https://{region}.digitaloceanspaces.com
    // Ejemplo: https://nyc3.digitaloceanspaces.com
    let cleanEndpoint: string;
    
    if (do_spaces_endpoint && do_spaces_endpoint.trim()) {
      try {
        const url = new URL(do_spaces_endpoint.trim());
        // Si el hostname incluye el bucket name, extraer solo la región
        // Ejemplo: kansaco-images.nyc3.digitaloceanspaces.com -> nyc3.digitaloceanspaces.com
        if (url.hostname.startsWith(`${this.bucketName}.`)) {
          url.hostname = url.hostname.replace(`${this.bucketName}.`, '');
        }
        // Construir el endpoint limpio (solo protocolo y hostname)
        cleanEndpoint = `${url.protocol}//${url.hostname}`;
        
        // Validar que el endpoint tenga el formato correcto
        if (!url.hostname.includes('.digitaloceanspaces.com')) {
          throw new Error('Endpoint does not match Digital Ocean Spaces format');
        }
      } catch (e) {
        // Si no es una URL válida o no tiene el formato correcto, construir desde la región
        this.logger.warn(`Invalid endpoint format: "${do_spaces_endpoint}". Constructing from region: ${do_region || 'nyc3'}`);
        cleanEndpoint = `https://${do_region || 'nyc3'}.digitaloceanspaces.com`;
      }
    } else {
      // Si no hay endpoint configurado, construir desde la región
      cleanEndpoint = `https://${do_region || 'nyc3'}.digitaloceanspaces.com`;
      this.logger.debug(`No endpoint configured, using default: ${cleanEndpoint}`);
    }
    
    this.logger.debug(`S3 Endpoint: ${cleanEndpoint}`);
    this.logger.debug(`S3 Region: ${do_region || 'nyc3'}`);
    this.logger.debug(`S3 Bucket: ${this.bucketName}`);
    
    // Digital Ocean Spaces REQUIERE forcePathStyle: true cuando usas endpoint personalizado
    this.s3 = new S3({
      credentials: {
        accessKeyId: do_access_key || '',
        secretAccessKey: do_secret_key || '',
      },
      endpoint: cleanEndpoint,
      region: do_region || 'nyc3',
      forcePathStyle: true, // REQUERIDO para Digital Ocean Spaces con endpoint personalizado
    });

    // Construir la URL base del bucket para acceso público
    // Formato: https://{bucket-name}.{region}.digitaloceanspaces.com
    if (do_url) {
      // Si do_url está configurado, usarlo directamente (debe ser la URL completa del bucket)
      // Ejemplo: https://kansaco-images.nyc3.digitaloceanspaces.com
      this.baseUrl = do_url.endsWith('/') ? do_url.slice(0, -1) : do_url;
      this.logger.debug(`Using configured DO_URL: ${this.baseUrl}`);
    } else if (do_region) {
      // Construir URL desde la región
      this.baseUrl = `https://${this.bucketName}.${do_region}.digitaloceanspaces.com`;
      this.logger.debug(`Constructed base URL from region: ${this.baseUrl}`);
    } else {
      // Fallback
      this.logger.warn(
        'No DO_URL or DO_REGION configured. Using default URL format.',
      );
      this.baseUrl = `https://${this.bucketName}.nyc3.digitaloceanspaces.com`;
    }
  }

  async getFile(fileName: string): Promise<Buffer> {
    try {
      // 1. Send the command
      const { Body } = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );

      // 2. The Body is often a Readable stream
      const stream = Body as Readable;

      // 3. Read all chunks into an array
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }

      // 4. Concatenate to get a single Buffer
      return Buffer.concat(chunks);
    } catch (e) {
      this.logger.error(e);
      throw new Error('Error getting file from DigitalOcean');
    }
  }

  async uploadFile(
    fileName: string,
    fileContent: Buffer,
  ): Promise<PutObjectCommandOutput> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileContent,
        ACL: ObjectCannedACL.public_read,
      };
      this.logger.debug(`Uploading file: ${fileName} to bucket: ${this.bucketName}`);
      const uploaded = await this.s3.send(new PutObjectCommand(params));
      this.logger.debug(`File uploaded successfully: ${fileName}`);
      return uploaded;
    } catch (e: any) {
      this.logger.error(`Error uploading file ${fileName}:`, e);
      this.logger.error(`Error details: ${JSON.stringify({
        message: e.message,
        code: e.Code,
        name: e.name,
        httpStatusCode: e.$metadata?.httpStatusCode,
        requestId: e.$metadata?.requestId,
      })}`);
      throw new Error(`Error uploading file to DigitalOcean: ${e.message || e}`);
    }
  }

  async listObjects(
    prefix?: string,
    maxKeys: number = 50,
    continuationToken?: string,
  ): Promise<{
    objects: Array<{ key: string; url: string; lastModified?: Date; size?: number }>;
    isTruncated: boolean;
    nextContinuationToken?: string;
  }> {
    try {
      const params: any = {
        Bucket: this.bucketName,
        MaxKeys: maxKeys,
      };

      if (prefix) {
        params.Prefix = prefix;
      }

      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }

      this.logger.debug(`Listing objects with params: ${JSON.stringify(params)}`);

      const response = await this.s3.send(new ListObjectsV2Command(params));

      this.logger.debug(`ListObjects response: ${JSON.stringify({
        KeyCount: response.KeyCount,
        IsTruncated: response.IsTruncated,
        ContentsLength: response.Contents?.length || 0,
      })}`);

      const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const objects = (response.Contents || []).map((object) => {
        const key = object.Key || '';
        const keyPath = key.startsWith('/') ? key.slice(1) : key;
        return {
          key,
          url: `${base}/${keyPath}`,
          lastModified: object.LastModified,
          size: object.Size,
        };
      });

      return {
        objects,
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (e: any) {
      // NoSuchKey con 404 puede ocurrir cuando:
      // 1. El bucket está vacío y se usa un prefijo que no existe
      // 2. Hay un problema con forcePathStyle
      // 3. El bucket realmente no existe
      
      this.logger.error(`Error listing objects: ${e.message || e}`, e.stack);
      this.logger.error(`Error details: ${JSON.stringify({
        Code: e.Code,
        name: e.name,
        httpStatusCode: e.$metadata?.httpStatusCode,
        BucketName: e.BucketName,
        RequestId: e.RequestId,
      })}`);
      
      // Si es un error 404/NoSuchKey, puede ser que el prefijo no tenga resultados
      // En este caso, retornar lista vacía en lugar de error
      if (e.Code === 'NoSuchKey' || e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) {
        this.logger.warn(`Received 404/NoSuchKey when listing with prefix "${prefix}". This may indicate the prefix has no objects. Returning empty list.`);
        return {
          objects: [],
          isTruncated: false,
        };
      }
      
      throw new Error(`Error listing objects from DigitalOcean: ${e.message || e}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
      };
      await this.s3.send(new DeleteObjectCommand(params));
    } catch (e) {
      this.logger.error(e);
      throw new Error('Error deleting file from DigitalOcean');
    }
  }

  getFileUrl(fileName: string): string {
    // Asegurar que no haya barras duplicadas
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const key = fileName.startsWith('/') ? fileName.slice(1) : fileName;
    return `${base}/${key}`;
  }

  /**
   * Verifica si un archivo existe en el bucket
   * @param fileName Key del archivo en el bucket
   * @returns true si el archivo existe, false si no existe
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if file exists: ${fileName}`);
      const result = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );
      this.logger.debug(`File exists: ${fileName}. Size: ${result.ContentLength} bytes`);
      return true;
    } catch (error: any) {
      // Si el error es 404 (NotFound), el archivo no existe
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.debug(`File not found: ${fileName}`);
        return false;
      }
      // Para otros errores, loguear y asumir que no existe
      this.logger.warn(
        `Error checking if file exists: ${fileName}. Error: ${error.message || error}`,
      );
      return false;
    }
  }
}
