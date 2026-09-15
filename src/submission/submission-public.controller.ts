import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SubmissionService } from './submission.service';
import { SubmissionCreateDto } from './dto/submission-create.dto';
import { ClientIpThrottlerGuard } from '../guards/client-ip.throttler';

/**
 * Intake público de los formularios del sitio.
 *
 * SIN AuthGuard a propósito: lo consumen visitantes anónimos. La protección es
 * rate limiting por IP real + honeypot + whitelist de payload en el service.
 *
 * Es el único controller público del módulo; la gestión vive en
 * `submission-admin.controller.ts`, que sí exige rol ADMIN.
 */
@Controller('public/submission')
@ApiTags('Kansaco - Solicitudes (público)')
@UseGuards(ClientIpThrottlerGuard)
export class SubmissionPublicController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // 1 envío cada 10s y 5 por hora, por IP del visitante.
  @Throttle({
    short: { limit: 1, ttl: 10_000 },
    medium: { limit: 5, ttl: 3_600_000 },
  })
  @ApiOperation({ summary: 'Enviar una solicitud desde un formulario público' })
  @ApiResponse({ status: 201, description: 'Solicitud registrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 429, description: 'Demasiados envíos' })
  async create(
    @Body() dto: SubmissionCreateDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    await this.submissionService.createPublic(dto, ip);

    // Respuesta idéntica cuando el honeypot descarta la solicitud: si el bot
    // recibiera un error, aprendería a evitar el campo trampa.
    return { message: 'Solicitud recibida' };
  }
}
