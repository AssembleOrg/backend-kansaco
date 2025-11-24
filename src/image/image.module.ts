import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { DigitalOceanService } from '../extraServices/digitalOcean.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { RolesGuard } from '../guards/roles.guard';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [ImageController],
  providers: [ImageService, DigitalOceanService, AuthGuard, RolesGuard],
  exports: [ImageService],
})
export class ImageModule {}

