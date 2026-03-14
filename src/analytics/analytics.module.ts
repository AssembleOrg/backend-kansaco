import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsPublicController } from './analytics-public.controller';
import { AnalyticsService } from './analytics.service';
import { UserEvent } from './user-event.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEvent, User, Order]),
    AuthModule,
    forwardRef(() => UserModule),
  ],
  controllers: [AnalyticsController, AnalyticsPublicController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
