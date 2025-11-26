import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cartItem.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Product } from '../product/product.entity';

@Module({
  controllers: [CartController],
  providers: [CartService, AuthGuard],
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, User, Product]),
    UserModule,
    AuthModule,
  ],
  exports: [CartService],
})
export class CartModule {}
