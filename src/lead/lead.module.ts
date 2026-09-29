import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { Vendor } from '../vendor/vendor.entity';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Vendor]), AuthModule, UserModule],
  controllers: [LeadController],
  providers: [LeadService, AuthGuard, RolesGuard],
  exports: [LeadService],
})
export class LeadModule {}
