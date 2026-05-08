import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from './deal.entity';
import { DealStageHistory } from './deal-stage-history.entity';
import { DealNote } from './deal-note.entity';
import { Lead } from '../lead/lead.entity';
import { Vendor } from '../vendor/vendor.entity';
import { PipelineStage } from '../pipeline-stage/pipeline-stage.entity';
import { TerminalReason } from '../pipeline-stage/terminal-reason.entity';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deal,
      DealStageHistory,
      DealNote,
      Lead,
      Vendor,
      PipelineStage,
      TerminalReason,
    ]),
    AuthModule,
    UserModule,
  ],
  controllers: [DealController],
  providers: [DealService, AuthGuard, RolesGuard],
  exports: [DealService],
})
export class DealModule {}
