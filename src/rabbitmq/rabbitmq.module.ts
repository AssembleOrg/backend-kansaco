import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqController } from './rabbitmq.controller';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqClientService } from './rabbitmq-client.service';
import { PdfModule } from '../pdf/pdf.module';
import { EmailModule } from '../email/email.module';
import { ProductoModule } from '../product/product.module';

@Global() // Hace el módulo global para que esté disponible en toda la app
@Module({
  imports: [
    ConfigModule,
    PdfModule,
    forwardRef(() => EmailModule), // Usar forwardRef para evitar dependencia circular
    ProductoModule,
  ],
  controllers: [RabbitmqController],
  providers: [RabbitmqService, RabbitmqClientService],
  exports: [RabbitmqClientService], // Exportar el cliente para que otros módulos puedan usarlo
})
export class RabbitmqModule {}

