import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './vendor.entity';
import { VendorCreateDto } from './dto/vendor-create.dto';
import { VendorUpdateDto } from './dto/vendor-update.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { formatDateISO } from '../helpers/date.helper';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async findAll(includeInactive = false): Promise<VendorResponseDto[]> {
    const where = includeInactive ? {} : { activo: true };
    const vendors = await this.vendorRepository.find({
      where,
      order: { nombre: 'ASC' },
    });
    return vendors.map((v) => this.toResponseDto(v));
  }

  async findOne(id: number): Promise<VendorResponseDto> {
    const vendor = await this.findEntity(id);
    return this.toResponseDto(vendor);
  }

  async findEntity(id: number): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendedor ${id} no encontrado`);
    }
    return vendor;
  }

  async create(dto: VendorCreateDto): Promise<VendorResponseDto> {
    const nombre = dto.nombre.trim();
    const existing = await this.vendorRepository.findOne({ where: { nombre } });
    if (existing) {
      throw new BadRequestException(`Ya existe un vendedor con nombre "${nombre}"`);
    }
    const vendor = this.vendorRepository.create({
      nombre,
      activo: dto.activo ?? true,
    });
    const saved = await this.vendorRepository.save(vendor);
    this.logger.log(`Vendedor creado: ${saved.nombre} (id=${saved.id})`);
    return this.toResponseDto(saved);
  }

  async update(id: number, dto: VendorUpdateDto): Promise<VendorResponseDto> {
    const vendor = await this.findEntity(id);
    if (dto.nombre !== undefined) {
      const nuevoNombre = dto.nombre.trim();
      if (nuevoNombre !== vendor.nombre) {
        const existing = await this.vendorRepository.findOne({
          where: { nombre: nuevoNombre },
        });
        if (existing) {
          throw new BadRequestException(
            `Ya existe un vendedor con nombre "${nuevoNombre}"`,
          );
        }
        vendor.nombre = nuevoNombre;
      }
    }
    if (dto.activo !== undefined) vendor.activo = dto.activo;
    const saved = await this.vendorRepository.save(vendor);
    return this.toResponseDto(saved);
  }

  async delete(id: number): Promise<void> {
    const vendor = await this.findEntity(id);
    await this.vendorRepository.remove(vendor);
    this.logger.log(`Vendedor eliminado: id=${id}`);
  }

  private toResponseDto(vendor: Vendor): VendorResponseDto {
    return {
      id: vendor.id,
      nombre: vendor.nombre,
      activo: vendor.activo,
      createdAt: formatDateISO(vendor.createdAt) || '',
      updatedAt: formatDateISO(vendor.updatedAt) || '',
    };
  }
}
