import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './vendor.entity';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor]), AuthModule, UserModule],
  controllers: [VendorController],
  providers: [VendorService, AuthGuard, RolesGuard],
  exports: [VendorService],
})
export class VendorModule {}
