import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProductoModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { CartModule } from './cart/cart.module';
import serverConfig from './config/server.config';
import postgresDbConfig from './config/postgresDb.config';
import digitalOceanConfig from './config/digitalOcean.config';
import * as path from 'path';
import { AdminSettingsModule } from './admin-settings/admin-settings.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { OrderModule } from './order/order.module';
import { ImageModule } from './image/image.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { CategoryModule } from './category/category.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { User } from './user/user.entity';
import { Product } from './product/product.entity';
import { ProductImage } from './product/product-image.entity';
import { Cart } from './cart/cart.entity';
import { CartItem } from './cart/cartItem.entity';
import { AdminSetting } from './admin-settings/admin-setting.entity';
import { Discount } from './discount/discount.entity';
import { Order } from './order/order.entity';
import { Category } from './category/category.entity';
import { UserEvent } from './analytics/user-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [serverConfig, postgresDbConfig, digitalOceanConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        ...(configService.get<string>('postgres.url')
          ? { url: configService.get<string>('postgres.url') }
          : {
              host: configService.get<string>('postgres.host'),
              port: configService.get<number>('postgres.port'),
              username: configService.get<string>('postgres.username'),
              password: configService.get<string>('postgres.password'),
              database: configService.get<string>('postgres.database'),
            }),
        entities: [
          // Importar entidades directamente para evitar problemas con paths
          User,
          Product,
          ProductImage,
          Cart,
          CartItem,
          AdminSetting,
          Discount,
          Order,
          Category,
          UserEvent,
        ],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second window
        limit: 10,   // max 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 second window
        limit: 50,   // max 50 requests per 10 seconds
      },
    ]),
    AuthModule,
    ProductoModule,
    UserModule,
    CartModule,
    AdminSettingsModule,
    EmailModule,
    OrderModule,
    ImageModule,
    RabbitmqModule,
    CategoryModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    console.log('AppModule initialized');
  }
}
