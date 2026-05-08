import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './quote.entity';
import { QuoteItem } from './quote-item.entity';
import { Deal } from '../deal/deal.entity';
import { Lead } from '../lead/lead.entity';
import { Product } from '../product/product.entity';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteItem, Deal, Lead, Product]),
    AuthModule,
    UserModule,
    PdfModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService, AuthGuard, RolesGuard],
  exports: [QuoteService],
})
export class QuoteModule {}
