import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Bulto, ProductBulto } from './bulto.entity';
import { Product } from '../product/product.entity';
import { splitPresentations } from './bulto.util';
import { AssignBultoDto, CreateBultoDto, UpdateBultoDto } from './dto/bulto.dto';

export interface BultoInfo {
  id: number;
  nombre: string;
  unidades: number;
}

/** Copia que se guarda dentro del pedido (histórico: no cambia si después se edita el bulto). */
export interface BultoSnapshot {
  nombre: string;
  unidades: number;
}

/** productId -> presentación -> bultos (de mayor a menor). */
export type BultosPorProducto = Record<number, Record<string, BultoInfo[]>>;

const key = (productId: number, presentation?: string | null) =>
  `${productId}|${presentation ?? ''}`;

@Injectable()
export class BultoService {
  constructor(
    @InjectRepository(Bulto)
    private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(ProductBulto)
    private readonly asignacionRepo: Repository<ProductBulto>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRUD de bultos ────────────────────────────────────────────────

  async list(): Promise<(BultoInfo & { asignados: number })[]> {
    const rows = await this.bultoRepo
      .createQueryBuilder('b')
      .leftJoin(ProductBulto, 'pb', 'pb.bultoId = b.id')
      .select(['b.id AS id', 'b.nombre AS nombre', 'b.unidades AS unidades'])
      .addSelect('COUNT(pb.id)::int', 'asignados')
      .groupBy('b.id')
      .orderBy('b.unidades', 'ASC')
      .addOrderBy('b.nombre', 'ASC')
      .getRawMany();
    return rows.map((r) => ({ ...r, unidades: Number(r.unidades) }));
  }

  private async findOrFail(id: number): Promise<Bulto> {
    const bulto = await this.bultoRepo.findOne({ where: { id } });
    if (!bulto) throw new NotFoundException(`Bulto ${id} no existe`);
    return bulto;
  }

  /** Nombre único sin distinguir mayúsculas ("caja x 24" == "Caja x 24"). */
  private async assertNombreLibre(nombre: string, exceptId?: number) {
    const qb = this.bultoRepo
      .createQueryBuilder('b')
      .where('LOWER(b.nombre) = LOWER(:nombre)', { nombre });
    if (exceptId) qb.andWhere('b.id <> :exceptId', { exceptId });
    if (await qb.getExists()) {
      throw new ConflictException(`Ya existe un bulto llamado "${nombre}"`);
    }
  }

  async create(dto: CreateBultoDto): Promise<Bulto> {
    await this.assertNombreLibre(dto.nombre);
    return this.bultoRepo.save(this.bultoRepo.create(dto));
  }

  async update(id: number, dto: UpdateBultoDto): Promise<Bulto> {
    const bulto = await this.findOrFail(id);
    if (dto.nombre !== undefined) await this.assertNombreLibre(dto.nombre, id);
    Object.assign(bulto, dto);
    return this.bultoRepo.save(bulto);
  }

  /**
   * Borra un bulto. Si tiene productos asignados exige `force` (la UI lo pide
   * tras confirmar) y en ese caso desasigna todo en la misma transacción.
   */
  async remove(id: number, force: boolean): Promise<{ desasignados: number }> {
    await this.findOrFail(id);
    const asignados = await this.asignacionRepo.count({ where: { bultoId: id } });
    if (asignados > 0 && !force) {
      throw new ConflictException(
        `El bulto tiene ${asignados} asignaciones. Confirmá para desasignarlas y borrarlo.`,
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ProductBulto, { bultoId: id });
      await manager.delete(Bulto, { id });
    });
    return { desasignados: asignados };
  }

  // ─── Asignaciones ──────────────────────────────────────────────────

  /**
   * Todas las presentaciones de todos los productos, con sus bultos.
   * Alimenta la vista de asignación (filtros y "pendientes" se hacen en el front).
   */
  async presentaciones() {
    const products = await this.productRepo.find({
      select: ['id', 'name', 'sku', 'presentation', 'isVisible'],
      order: { name: 'ASC' },
    });
    const mapa = await this.mapForProducts();
    return products.flatMap((p) =>
      splitPresentations(p.presentation).map((presentation) => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        isVisible: p.isVisible,
        presentation,
        bultos: mapa[p.id]?.[presentation] ?? [],
      })),
    );
  }

  /** Valida que cada ítem sea una presentación real de un producto existente. */
  private async validarItems(items: AssignBultoDto['items']) {
    const ids = [...new Set(items.map((i) => i.productId))];
    const products = await this.productRepo.find({
      where: { id: In(ids) },
      select: ['id', 'presentation'],
    });
    const opciones = new Map(
      products.map((p) => [p.id, new Set(splitPresentations(p.presentation))]),
    );
    const invalidos = items.filter(
      (i) => !opciones.get(i.productId)?.has(i.presentation),
    );
    if (invalidos.length > 0) {
      throw new BadRequestException(
        `Presentaciones inexistentes: ${invalidos
          .slice(0, 10)
          .map((i) => `#${i.productId} "${i.presentation}"`)
          .join(', ')}`,
      );
    }
    // Deduplicar (mismo producto+presentación enviado dos veces).
    return [...new Map(items.map((i) => [key(i.productId, i.presentation), i])).values()];
  }

  /**
   * Asigna el bulto a los ítems. dryRun (default) solo devuelve qué pasaría.
   * Idempotente: los que ya lo tenían se informan y no se tocan.
   */
  async assign(bultoId: number, dto: AssignBultoDto) {
    const bulto = await this.findOrFail(bultoId);
    const items = await this.validarItems(dto.items);
    const existentes = await this.asignacionRepo.find({
      where: { bultoId, productId: In(items.map((i) => i.productId)) },
    });
    const ya = new Set(existentes.map((e) => key(e.productId, e.presentation)));
    const nuevos = items.filter((i) => !ya.has(key(i.productId, i.presentation)));

    if (dto.dryRun !== false) {
      return { dryRun: true, bulto, agregar: nuevos, yaTenian: items.length - nuevos.length };
    }
    if (nuevos.length > 0) {
      await this.asignacionRepo
        .createQueryBuilder()
        .insert()
        .values(nuevos.map((i) => ({ ...i, bultoId })))
        .orIgnore() // ON CONFLICT DO NOTHING: carrera entre dos admins
        .execute();
    }
    return { dryRun: false, bulto, agregados: nuevos.length, yaTenian: items.length - nuevos.length };
  }

  /** Quita el bulto de los ítems. dryRun (default) solo devuelve qué pasaría. */
  async unassign(bultoId: number, dto: AssignBultoDto) {
    const bulto = await this.findOrFail(bultoId);
    const pedidos = new Set(dto.items.map((i) => key(i.productId, i.presentation)));
    const existentes = await this.asignacionRepo.find({
      where: { bultoId, productId: In(dto.items.map((i) => i.productId)) },
    });
    const quitar = existentes.filter((e) => pedidos.has(key(e.productId, e.presentation)));

    if (dto.dryRun !== false) {
      return { dryRun: true, bulto, quitar: quitar.map(({ productId, presentation }) => ({ productId, presentation })) };
    }
    if (quitar.length > 0) {
      await this.asignacionRepo.delete({ id: In(quitar.map((q) => q.id)) });
    }
    return { dryRun: false, bulto, quitados: quitar.length };
  }

  // ─── Lectura para tienda / pedidos ─────────────────────────────────

  /** Sin ids: todas las asignaciones (uso de staff). */
  async mapForProducts(productIds?: number[]): Promise<BultosPorProducto> {
    if (productIds?.length === 0) return {};
    const rows = await this.asignacionRepo.find({
      where: productIds ? { productId: In(productIds) } : {},
      relations: ['bulto'],
    });
    const out: BultosPorProducto = {};
    for (const r of rows) {
      const porPres = (out[r.productId] ??= {});
      (porPres[r.presentation] ??= []).push({
        id: r.bulto.id,
        nombre: r.bulto.nombre,
        unidades: r.bulto.unidades,
      });
    }
    for (const porPres of Object.values(out)) {
      for (const lista of Object.values(porPres)) lista.sort((a, b) => b.unidades - a.unidades);
    }
    return out;
  }

  /** Snapshot de bultos para ítems de pedido (key = productId|presentation). */
  async snapshotFor(
    items: { productId: number; presentation?: string | null }[],
  ): Promise<Map<string, BultoSnapshot[]>> {
    const mapa = await this.mapForProducts([...new Set(items.map((i) => i.productId))]);
    const out = new Map<string, BultoSnapshot[]>();
    for (const i of items) {
      const lista = mapa[i.productId]?.[i.presentation ?? ''];
      if (lista?.length) {
        out.set(
          key(i.productId, i.presentation),
          lista.map(({ nombre, unidades }) => ({ nombre, unidades })),
        );
      }
    }
    return out;
  }

  static key = key;

  /**
   * Borra asignaciones cuya presentación ya no existe en el producto
   * (el admin editó el texto de presentación). Devuelve las borradas.
   */
  async pruneOrphans(manager: EntityManager, productId: number, presentation: string) {
    const vigentes = splitPresentations(presentation);
    const repo = manager.getRepository(ProductBulto);
    const actuales = await repo.find({ where: { productId } });
    const huerfanas = actuales.filter((a) => !vigentes.includes(a.presentation));
    if (huerfanas.length > 0) {
      await repo.delete({ id: In(huerfanas.map((h) => h.id)) });
    }
    return huerfanas.map((h) => h.presentation);
  }
}
