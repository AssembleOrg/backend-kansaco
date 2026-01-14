import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { User } from './user/user.entity';
import { Product } from './product/product.entity';
import { ProductImage } from './product/product-image.entity';
import { Cart } from './cart/cart.entity';
import { CartItem } from './cart/cartItem.entity';
import { AdminSetting } from './admin-settings/admin-setting.entity';
import { Discount } from './discount/discount.entity';
import { Order } from './order/order.entity';
import { Category } from './category/category.entity';

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
        host: configService.get<string>('postgres.host'),
        port: configService.get<number>('postgres.port'),
        username: configService.get<string>('postgres.username'),
        password: configService.get<string>('postgres.password'),
        database: configService.get<string>('postgres.database'),
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
        ],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    console.log('AppModule initialized');
  }
}
