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
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../user/user.enum';

@Controller('category')
@ApiTags('Kansaco - Categories')
export class CategoryController {
  private readonly logger = new Logger(CategoryController.name);

  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all categories' })
  @ApiOkResponse({
    description: 'List of all categories',
    type: [CategoryResponseDto],
  })
  async findAll(): Promise<CategoryResponseDto[]> {
    return await this.categoryService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Category ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Category details',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (ADMIN/ASISTENTE only)' })
  @ApiOkResponse({
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Category name already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(
    @Body(ValidationPipe) dto: CategoryCreateDto,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.create(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (ADMIN/ASISTENTE only)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Category ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Category name already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: CategoryUpdateDto,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ASISTENTE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (ADMIN/ASISTENTE only)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Category ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Category deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Category deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category because it is in use by products',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.categoryService.delete(id);
    return { message: 'Category deleted successfully' };
  }
}
