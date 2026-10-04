import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { OptionalAuthGuard } from '../guards/optional-auth.guard';
import { AuthGuard } from '../guards/auth.guard';

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
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @IsNumber()
  resultsCount?: number;

  // Id anónimo por navegador (localStorage) para contar personas, no aperturas.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;
}

class LinkVisitorDto {
  @IsString()
  @MaxLength(64)
  visitorId: string;
}

// 'actividad/vista' es alias: los bloqueadores (uBlock, Brave) filtran
// cualquier URL con /analytics/ o /track, y esas vistas se perdían.
@Controller(['analytics', 'actividad'])
@ApiTags('Kansaco - Analytics (Public)')
export class AnalyticsPublicController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post(['track', 'vista'])
  @SkipThrottle()
  @UseGuards(OptionalAuthGuard)
  async trackPublicEvent(@Body() body: TrackEventDto, @Req() req: any) {
    const allowedTypes = ['product_view', 'search'];
    if (!allowedTypes.includes(body.eventType)) {
      return { ok: true };
    }

    const payload: Record<string, any> = {};
    // Rol al momento del evento: permite excluir tráfico interno de rankings.
    if (req.user?.rol) payload.rol = req.user.rol;
    if (body.visitorId) payload.visitorId = body.visitorId;

    if (body.eventType === 'product_view') {
      if (body.productId) payload.productId = body.productId;
      if (body.productName) payload.productName = body.productName;
      if (body.productSlug) payload.productSlug = body.productSlug;
    }

    if (body.eventType === 'search' && body.query) {
      payload.query = body.query;
      if (body.resultsCount !== undefined) payload.resultsCount = body.resultsCount;
    }

    // Fire & forget
    this.analyticsService.trackEvent(req.user?.id ?? null, body.eventType, payload);

    return { ok: true };
  }

  // Al loguearse: la navegación anónima previa de este navegador pasa al usuario.
  @Post('vincular')
  @UseGuards(AuthGuard)
  async linkVisitor(@Body() body: LinkVisitorDto, @Req() req: any) {
    this.analyticsService.linkVisitorToUser(body.visitorId, req.user.id, req.user.rol);
    return { ok: true };
  }
}
