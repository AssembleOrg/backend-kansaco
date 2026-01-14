import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Category } from './category.entity';
import { CategoryCreateDto } from './dto/category-create.dto';
import { CategoryUpdateDto } from './dto/category-update.dto';
import { formatDateISO } from '../helpers/date.helper';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });

    return categories.map((cat) => this.toResponseDto(cat));
  }

  async findOne(id: number): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return this.toResponseDto(category);
  }

  async create(dto: CategoryCreateDto): Promise<CategoryResponseDto> {
    // Verificar si ya existe una categoría con ese nombre
    const existing = await this.categoryRepository.findOne({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new BadRequestException(
        `Category with name "${dto.name}" already exists`,
      );
    }

    const category = this.categoryRepository.create({
      name: dto.name.trim(),
    });

    const saved = await this.categoryRepository.save(category);
    this.logger.log(`Created category: ${saved.name} (ID: ${saved.id})`);

    return this.toResponseDto(saved);
  }

  async update(
    id: number,
    dto: CategoryUpdateDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    // Si se está actualizando el nombre, verificar que no exista otra categoría con ese nombre
    if (dto.name && dto.name.trim() !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { name: dto.name.trim() },
      });

      if (existing) {
        throw new BadRequestException(
          `Category with name "${dto.name}" already exists`,
        );
      }

      category.name = dto.name.trim();
    }

    const saved = await this.categoryRepository.save(category);
    this.logger.log(`Updated category: ${saved.name} (ID: ${saved.id})`);

    return this.toResponseDto(saved);
  }

  async delete(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    // Validar que no esté en uso por productos
    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it is being used by ${category.products.length} product(s)`,
      );
    }

    await this.categoryRepository.remove(category);
    this.logger.log(`Deleted category: ${category.name} (ID: ${id})`);
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { name: name.trim() },
    });
  }

  async findByIds(ids: number[]): Promise<Category[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.categoryRepository.find({
      where: { id: In(ids) },
    });
  }

  /**
   * Busca o crea categorías por nombre. Si no existen, las crea.
   * Útil para migración y creación de productos.
   */
  async findOrCreateByNames(names: string[]): Promise<Category[]> {
    const categories: Category[] = [];
    const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

    for (const name of uniqueNames) {
      let category = await this.findByName(name);

      if (!category) {
        // Crear la categoría si no existe
        category = this.categoryRepository.create({ name });
        category = await this.categoryRepository.save(category);
        this.logger.debug(`Auto-created category: ${name} (ID: ${category.id})`);
      }

      categories.push(category);
    }

    return categories;
  }

  private toResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      createdAt: formatDateISO(category.createdAt) || '',
      updatedAt: formatDateISO(category.updatedAt) || '',
    };
  }
}
