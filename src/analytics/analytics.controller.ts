import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';
import { formatDateISO } from '../helpers/date.helper';

@Controller('analytics')
@ApiTags('Kansaco - Analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year', 'lastYear', 'custom', 'all'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date for custom period (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date for custom period (YYYY-MM-DD)' })
  async getDashboard(
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const [stats, topSearches, anonymousSearches, topProducts, bottomProducts, topViewed] = await Promise.all([
      this.analyticsService.getStats(),
      this.analyticsService.getTopSearches(10, period, dateFrom, dateTo),
      this.analyticsService.getAnonymousSearches(10, period, dateFrom, dateTo),
      this.analyticsService.getProductRanking({ order: 'top', limit: 5, period, dateFrom, dateTo }),
      this.analyticsService.getProductRanking({ order: 'bottom', limit: 5, period, dateFrom, dateTo }),
      this.analyticsService.getTopViewedProducts(10, period, dateFrom, dateTo),
    ]);
    return { stats, topSearches, anonymousSearches, topProducts, bottomProducts, topViewed };
  }

  @Get('events')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.analyticsService.getEvents({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userId,
      eventType,
      dateFrom,
      dateTo,
      search,
    });

    return {
      ...result,
      data: result.data.map((event) => ({
        ...event,
        createdAt: formatDateISO(event.createdAt) || '',
      })),
    };
  }

  @Get('top-searches')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopSearches(@Query('limit') limit?: string) {
    return this.analyticsService.getTopSearches(
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('users')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.analyticsService.getUsersPaginated({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @Get('product-ranking')
  @ApiQuery({ name: 'order', required: false, enum: ['top', 'bottom'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year', 'lastYear', 'custom', 'all'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getProductRanking(
    @Query('order') order?: 'top' | 'bottom',
    @Query('limit') limit?: string,
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProductRanking({
      order: order || 'top',
      limit: limit ? parseInt(limit) : undefined,
      period,
      dateFrom,
      dateTo,
    });
  }

  @Get('products/compare')
  @ApiQuery({ name: 'periodAFrom', required: true, type: String, description: 'Period A start (YYYY-MM-DD)' })
  @ApiQuery({ name: 'periodATo', required: true, type: String, description: 'Period A end (YYYY-MM-DD)' })
  @ApiQuery({ name: 'periodBFrom', required: true, type: String, description: 'Period B start (YYYY-MM-DD)' })
  @ApiQuery({ name: 'periodBTo', required: true, type: String, description: 'Period B end (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async compareProducts(
    @Query('periodAFrom') periodAFrom: string,
    @Query('periodATo') periodATo: string,
    @Query('periodBFrom') periodBFrom: string,
    @Query('periodBTo') periodBTo: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.compareProductPeriods({
      periodA: { dateFrom: periodAFrom, dateTo: periodATo },
      periodB: { dateFrom: periodBFrom, dateTo: periodBTo },
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('user-activity')
  @ApiQuery({ name: 'userId', required: true, type: String })
  async getUserActivity(@Query('userId') userId: string) {
    const result = await this.analyticsService.getUserActivity(userId);
    return {
      ...result,
      lastLogin: formatDateISO(result.lastLogin) || null,
    };
  }
}
