import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { VendorCreateDto } from './dto/vendor-create.dto';
import { VendorUpdateDto } from './dto/vendor-update.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('crm/vendor')
@ApiTags('Kansaco - CRM Vendor')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vendedores' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [VendorResponseDto] })
  async findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<VendorResponseDto[]> {
    return this.vendorService.findAll(includeInactive ?? false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de vendedor' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VendorResponseDto> {
    return this.vendorService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear vendedor' })
  async create(
    @Body(ValidationPipe) dto: VendorCreateDto,
  ): Promise<VendorResponseDto> {
    return this.vendorService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar vendedor' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: VendorUpdateDto,
  ): Promise<VendorResponseDto> {
    return this.vendorService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vendedor' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.vendorService.delete(id);
    return { message: 'Vendedor eliminado' };
  }
}
