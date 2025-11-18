import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSetting } from './admin-setting.entity';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService, AuthGuard],
  imports: [TypeOrmModule.forFeature([AdminSetting]), UserModule, AuthModule],
})
export class AdminSettingsModule {}
