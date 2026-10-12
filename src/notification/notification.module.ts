import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { User } from '../user/user.entity';
import { AuthGuard } from '../guards/auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  // RabbitmqClientService llega por RabbitmqModule, que es @Global.
  imports: [TypeOrmModule.forFeature([Notification, User]), AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService, AuthGuard],
  exports: [NotificationService],
})
export class NotificationModule {}
