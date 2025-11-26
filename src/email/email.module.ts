import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { PdfModule } from '../pdf/pdf.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [ConfigModule, AuthModule, forwardRef(() => OrderModule), RabbitmqModule, PdfModule, CartModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
