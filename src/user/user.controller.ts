import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserLogin } from './dto/userLogin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeBloqueoDto } from './dto/change-bloqueo.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from './user.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@Controller('user')
export class UserController {
  protected logger = new Logger('UserController');

  constructor(private readonly userService: UserService) {}

  @Post('/register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('/login')
  async login(@Body() userLogin: UserLogin) {
    try {
      return await this.userService.login(userLogin.email, userLogin.password);
    } catch (error) {
      this.logger.error('Login error:', error);
      throw error;
    }
  }

  // Listado completo (mail, teléfono, dirección de todos): sólo el staff.
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth('access-token')
  async findAll() {
    return this.userService.findAll();
  }

  @Get('/profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  async getMyProfile(
    @Request() req: { user: { id: string } },
  ) {
    return this.userService.findOne(req.user.id);
  }

  @Put('/profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado (nombre, contraseña, etc.)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validación' })
  @ApiResponse({ status: 409, description: 'Email ya en uso' })
  async updateMyProfile(
    @Request() req: { user: { id: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // El rol sólo lo cambia el admin (PATCH /:id/rol). Sin esto, cualquier
    // cliente podía hacerse ADMIN mandando { rol } acá.
    const safe: UpdateUserDto = { ...updateUserDto };
    delete safe.rol;
    return this.userService.update(req.user.id, safe);
  }

  @Patch('/:id/rol')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cambiar la categoría/rol de un usuario (solo ADMIN)' })
  async changeRole(
    @Param('id') id: string,
    @Body() changeRoleDto: ChangeRoleDto,
  ) {
    return this.userService.changeRole(id, changeRoleDto.rol);
  }

  @Patch('/:id/bloqueo')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Frenar (COBRANZAS | VENTAS) o destrabar (null) una cuenta de cliente. ADMIN y ASISTENTE.',
  })
  async changeBloqueo(@Param('id') id: string, @Body() dto: ChangeBloqueoDto) {
    return this.userService.changeBloqueo(id, dto.bloqueo);
  }

  // Operar sobre OTRA cuenta por id: sólo ADMIN. Antes alcanzaba con estar
  // logueado, así que cualquier cliente podía leer, editar (incluso el rol) o
  // borrar a cualquier otro usuario.
  @Get('/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  async getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put('/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
