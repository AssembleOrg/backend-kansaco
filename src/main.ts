import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { DateSerializeInterceptor } from './interceptors/date-serialize.interceptor';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

// middlewares de seguridad
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as hpp from 'hpp';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Si estás detrás de un proxy (nginx / ingress / load balancer), Express debe "confiar"
  // en los headers `X-Forwarded-*` para que middlewares como express-rate-limit identifiquen bien la IP.
  const configService = app.get(ConfigService);
  const trustProxyRaw = configService.get<string>(
    'TRUST_PROXY',
    isProduction ? '1' : '0',
  );
  const trustProxy =
    trustProxyRaw === 'true' || trustProxyRaw === '1' || trustProxyRaw === 'yes';
  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // 1. Helmet: cabeceras HTTP seguras (configured to work with CORS)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // Disable CSP to avoid CORS issues
    }),
  );

  // Enable CORS with proper configuration (after Helmet to ensure headers are set)
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // 2. HPP: evita contaminación de parámetros
  app.use(hpp());

  // 4. Rate Limiter: ventana de 15 minutos.
  // - Bypass de preflight OPTIONS (no consume cupo).
  // - Bypass de healthchecks.
  // - keyGenerator por (IP + Authorization) para que varios usuarios atrás del
  //   mismo NAT/proxy no compartan el contador.
  // NOTA: storage in-memory; con múltiples instancias migrar a rate-limit-redis.
  const rateLimitMax = Number(
    configService.get<string>('RATE_LIMIT_MAX', '1000'),
  );
  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000,
      max: rateLimitMax,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => {
        if (req.method === 'OPTIONS') return true;
        const url = req.originalUrl || req.url || '';
        return url.startsWith('/api/health') || url === '/api' || url === '/';
      },
      keyGenerator: (req) => {
        const auth = req.headers['authorization'];
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        if (typeof auth === 'string' && auth.length > 0) {
          // últimos 16 chars del token alcanzan para distinguir usuarios
          return `${ip}|${auth.slice(-16)}`;
        }
        return ip;
      },
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

  // Conectar a RabbitMQ como microservicio
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
  const rabbitmqQueue = configService.get<string>('RABBITMQ_QUEUE', 'kansaco-queue');

  try {
    app.connectMicroservice<MicroserviceOptions>(
      {
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: rabbitmqQueue,
          queueOptions: {
            durable: true,
          },
          // NestJS microservices maneja automáticamente el exchange y routing keys
          // basándose en los @EventPattern decorators
        },
      },
      { inheritAppConfig: true },
    );

    await app.startAllMicroservices();
    console.log(`📨 RabbitMQ microservice connected to queue: ${rabbitmqQueue}`);
  } catch (error) {
    console.error(`⚠️  Error connecting RabbitMQ microservice: ${error.message}`);
    console.log('⚠️  Continuing without RabbitMQ microservice. RabbitmqClientService will retry automatically.');
  }

  const port = configService.get<string>('server.port') || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
