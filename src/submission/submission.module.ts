import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactSubmission } from './submission.entity';
import { SubmissionService } from './submission.service';
import { SubmissionPublicController } from './submission-public.controller';
import { SubmissionAdminController } from './submission-admin.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactSubmission]),
    AuthModule,
    UserModule,
  ],
  controllers: [SubmissionPublicController, SubmissionAdminController],
  providers: [SubmissionService, AuthGuard, RolesGuard],
  exports: [SubmissionService],
})
export class SubmissionModule {}
