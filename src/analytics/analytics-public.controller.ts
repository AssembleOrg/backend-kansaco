import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

class TrackEventDto {
  @IsString()
  eventType: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsOptional()
  @IsString()
  query?: string;
}

@Controller('analytics')
@ApiTags('Kansaco - Analytics (Public)')
export class AnalyticsPublicController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @SkipThrottle()
  async trackPublicEvent(@Body() body: TrackEventDto) {
    const allowedTypes = ['product_view', 'search'];
    if (!allowedTypes.includes(body.eventType)) {
      return { ok: true };
    }

    const payload: Record<string, any> = {};

    if (body.eventType === 'product_view') {
      if (body.productId) payload.productId = body.productId;
      if (body.productName) payload.productName = body.productName;
      if (body.productSlug) payload.productSlug = body.productSlug;
    }

    if (body.eventType === 'search' && body.query) {
      payload.query = body.query;
    }

    // Fire & forget
    this.analyticsService.trackEvent(null, body.eventType, payload);

    return { ok: true };
  }
}
