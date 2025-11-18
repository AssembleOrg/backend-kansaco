import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { DateSerializeInterceptor } from './interceptors/date-serialize.interceptor';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// middlewares de seguridad
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as hpp from 'hpp';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 1. Helmet: cabeceras HTTP seguras (configured to work with CORS)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // Disable CSP to avoid CORS issues
    }),
  );

  // Enable CORS with proper configuration (after Helmet to ensure headers are set)
  app.enableCors({
    origin: true, // Allow all origins in development
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // 2. HPP: evita contaminación de parámetros
  app.use(hpp());

  // 4. Rate Limiter: máximo 100 requests por IP cada 15 minutos
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // límite de peticiones
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );


  // Pipes, filtros e interceptores globales (igual que antes)
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new DateSerializeInterceptor(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );

  // — Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Kansaco 2025 API')
    .setDescription('Endpoints to manage Productos, Pedidos, etc.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app as any, config);

  SwaggerModule.setup('docs', app as any, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<string>('server.port') || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
