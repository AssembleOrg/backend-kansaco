import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { ProductoService } from './product.service';
import { ProductoController } from './product.controller';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserModule } from 'src/user/user.module';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthModule } from 'src/auth/auth.module';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    UserModule,
    AuthModule,
    forwardRef(() => ImageModule),
  ],
  controllers: [ProductoController],
  providers: [ProductoService, AuthGuard, RolesGuard],
  exports: [ProductoService],
})
export class ProductoModule {}
