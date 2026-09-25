import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BultoService } from './bulto.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';
import { AssignBultoDto, CreateBultoDto, UpdateBultoDto } from './dto/bulto.dto';

@Controller('bulto')
@ApiTags('Kansaco - Bultos')
export class BultoController {
  constructor(private readonly bultoService: BultoService) {}

  /** Público (igual que el catálogo): bultos por producto/presentación. ?ids=1,2,3 */
  @Get('products')
  @ApiOperation({ summary: 'Bultos de varios productos, por presentación' })
  async forProducts(@Query('ids') ids = '') {
    const list = [...new Set(ids.split(',').map(Number))].filter(
      (n) => Number.isInteger(n) && n > 0,
    );
    if (list.length > 500) throw new BadRequestException('Máximo 500 productos');
    return this.bultoService.mapForProducts(list);
  }

  // Staff: mismos roles que editan productos.
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  async list() {
    return this.bultoService.list();
  }

  @Get('presentaciones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Todas las presentaciones de productos con sus bultos' })
  async presentaciones() {
    return this.bultoService.presentaciones();
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  async create(@Body() dto: CreateBultoDto) {
    return this.bultoService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBultoDto) {
    return this.bultoService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number, @Query('force') force?: string) {
    return this.bultoService.remove(id, force === 'true');
  }

  @Post(':id/assign')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar bulto a presentaciones (dryRun por defecto)' })
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignBultoDto) {
    return this.bultoService.assign(id, dto);
  }

  @Post(':id/unassign')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quitar bulto de presentaciones (dryRun por defecto)' })
  async unassign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignBultoDto) {
    return this.bultoService.unassign(id, dto);
  }
}
