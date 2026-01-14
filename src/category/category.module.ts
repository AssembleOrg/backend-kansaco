import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    AuthModule,
    UserModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, AuthGuard, RolesGuard],
  exports: [CategoryService],
})
export class CategoryModule {}
