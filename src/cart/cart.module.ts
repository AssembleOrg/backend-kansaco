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

@Module({
  controllers: [CartController],
  providers: [CartService, AuthGuard],
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, User]),
    UserModule,
    AuthModule,
  ],
})
export class CartModule {}
