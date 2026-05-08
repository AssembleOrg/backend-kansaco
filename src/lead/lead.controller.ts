import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { LeadCreateDto } from './dto/lead-create.dto';
import { LeadUpdateDto } from './dto/lead-update.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('crm/lead')
@ApiTags('Kansaco - CRM Lead')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @ApiOperation({ summary: 'Listar leads (admin only)' })
  @ApiOkResponse({ type: [LeadResponseDto] })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: LeadFilterDto,
  ): Promise<LeadResponseDto[]> {
    return this.leadService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LeadResponseDto> {
    return this.leadService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  async create(
    @Body(ValidationPipe) dto: LeadCreateDto,
  ): Promise<LeadResponseDto> {
    return this.leadService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: LeadUpdateDto,
  ): Promise<LeadResponseDto> {
    return this.leadService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar lead' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.leadService.delete(id);
    return { message: 'Lead eliminado' };
  }
}
