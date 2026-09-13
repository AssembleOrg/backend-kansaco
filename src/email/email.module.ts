import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { PdfModule } from '../pdf/pdf.module';
import { CartModule } from '../cart/cart.module';
import { PricingModule } from '../pricing/pricing.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    forwardRef(() => OrderModule),
    RabbitmqModule,
    PdfModule,
    CartModule,
    PricingModule,
    // UserModule: el checkout lee el estado actual de la cuenta (freno, categoría).
    UserModule,
  ],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
