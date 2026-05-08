import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineStage } from './pipeline-stage.entity';
import { TerminalReason } from './terminal-reason.entity';
import { PipelineStageService } from './pipeline-stage.service';
import { PipelineStageController } from './pipeline-stage.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineStage, TerminalReason]),
    AuthModule,
    UserModule,
  ],
  controllers: [PipelineStageController],
  providers: [PipelineStageService, AuthGuard, RolesGuard],
  exports: [PipelineStageService],
})
export class PipelineStageModule {}
