import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductoService } from './product.service';
import { ProductoController } from './product.controller';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserModule } from 'src/user/user.module';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), UserModule, AuthModule],
  controllers: [ProductoController],
  providers: [ProductoService, AuthGuard, RolesGuard],
})
export class ProductoModule {}
