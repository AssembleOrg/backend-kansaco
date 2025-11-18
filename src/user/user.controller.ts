import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserLogin } from './dto/userLogin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../guards/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  async findAll() {
    return this.userService.findAll();
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  async getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
