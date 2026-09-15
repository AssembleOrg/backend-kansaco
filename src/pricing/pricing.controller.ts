import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';
import { UpdateRolePricingDto } from './dto/update-role-pricing.dto';

@Controller('pricing')
@ApiTags('Kansaco - Pricing')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('roles')
  async getRolePricing() {
    return this.pricingService.listAll();
  }

  @Patch('roles')
  async updateRolePricing(@Body() dto: UpdateRolePricingDto) {
    return this.pricingService.saveMany(dto.items);
  }
}
