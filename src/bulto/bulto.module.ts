import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bulto, ProductBulto } from './bulto.entity';
import { Product } from '../product/product.entity';
import { BultoService } from './bulto.service';
import { BultoController } from './bulto.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bulto, ProductBulto, Product]), AuthModule, UserModule],
  controllers: [BultoController],
  providers: [BultoService],
  exports: [BultoService],
})
export class BultoModule {}
