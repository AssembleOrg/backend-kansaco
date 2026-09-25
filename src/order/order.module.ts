import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './order.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PdfModule } from '../pdf/pdf.module';
import { PricingModule } from '../pricing/pricing.module';
import { BultoModule } from '../bulto/bulto.module';

@Module({
  imports: [
    // Product y User: para recalcular precios al editar un pedido.
    TypeOrmModule.forFeature([Order, Product, User]),
    AuthModule,
    UserModule,
    PdfModule,
    PricingModule,
    BultoModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
