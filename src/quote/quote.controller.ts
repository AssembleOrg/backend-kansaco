import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { QuoteService } from './quote.service';
import { QuoteCreateDto } from './dto/quote-create.dto';
import { QuoteUpdateDto } from './dto/quote-update.dto';
import { QuoteEstadoChangeDto } from './dto/quote-estado-change.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('crm/quote')
@ApiTags('Kansaco - CRM Quote')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  @ApiOperation({ summary: 'Listar presupuestos por deal' })
  @ApiQuery({ name: 'dealId', type: Number, required: true })
  @ApiOkResponse({ type: [QuoteResponseDto] })
  async findByDeal(
    @Query('dealId', ParseIntPipe) dealId: number,
  ): Promise<QuoteResponseDto[]> {
    return this.quoteService.findByDeal(dealId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de presupuesto' })
  @ApiOkResponse({ type: QuoteResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<QuoteResponseDto> {
    return this.quoteService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear presupuesto y sincronizar Deal.monto' })
  async create(
    @Body(ValidationPipe) dto: QuoteCreateDto,
  ): Promise<QuoteResponseDto> {
    return this.quoteService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar presupuesto (recalcula totales y sincroniza Deal.monto). No se permite si está ACEPTADO',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: QuoteUpdateDto,
  ): Promise<QuoteResponseDto> {
    return this.quoteService.update(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado del presupuesto' })
  async changeEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: QuoteEstadoChangeDto,
  ): Promise<QuoteResponseDto> {
    return this.quoteService.changeEstado(id, dto.estado);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar presupuesto (no permitido si está ACEPTADO)' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.quoteService.delete(id);
    return { message: 'Presupuesto eliminado' };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar el PDF del presupuesto' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, numero } = await this.quoteService.generatePdfBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${numero}.pdf"`,
    );
    res.send(buffer);
  }
}
