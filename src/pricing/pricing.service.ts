import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePricing } from './role-pricing.entity';
import { B2B_ROLES, esCategoriaB2B, UserRole } from '../user/user.enum';

// Roles de gestión: ven el precio BASE (sin recargo) para poder administrarlo.
const MANAGEMENT_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.ASISTENTE,
];

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(RolePricing)
    private readonly rolePricingRepo: Repository<RolePricing>,
  ) {}

  /**
   * Precio a exponer para un rol:
   *  - Categoría B2B  -> precio de su lista = base * (1 + %/100).
   *  - ADMIN/ASISTENTE -> precio BASE (lo gestionan; no llevan recargo).
   *  - Anónimo / minorista(pendiente) / rol desconocido -> null (no ven precio).
   */
  applyRolePricing(base: number, rol: UserRole | null | undefined, percentage: number): number | null {
    const b = Number(base);
    if (!isFinite(b)) return null;
    if (rol && MANAGEMENT_ROLES.includes(rol)) return Math.round(b * 100) / 100;
    if (!esCategoriaB2B(rol)) return null;
    return Math.round(b * (1 + percentage / 100) * 100) / 100;
  }

  /** Variante que resuelve el porcentaje del rol desde el cache/BD. */
  async priceForRole(base: number, rol: UserRole | null | undefined): Promise<number | null> {
    if (!esCategoriaB2B(rol)) return null;
    const percentage = await this.getPercentage(rol as UserRole);
    return this.applyRolePricing(base, rol, percentage);
  }

  async getPercentage(rol: UserRole): Promise<number> {
    const map = await this.getMap();
    return map.get(rol) ?? 0;
  }

  async getMap(): Promise<Map<UserRole, number>> {
    // Sin cache: la tabla tiene ≤7 filas, leerla por request es trivial y
    // evita staleness (el precio siempre refleja lo guardado en BD).
    const rows = await this.rolePricingRepo.find();
    const map = new Map<UserRole, number>();
    for (const row of rows) map.set(row.rol, Number(row.percentage));
    return map;
  }

  /** Lista de precios para la vista admin: una fila por cada categoría B2B. */
  async listAll(): Promise<RolePricing[]> {
    const rows = await this.rolePricingRepo.find();
    const byRole = new Map(rows.map((r) => [r.rol, r]));
    // Garantiza que aparezcan todas las categorías B2B aunque falte la fila.
    return B2B_ROLES.map(
      (rol) =>
        byRole.get(rol) ??
        ({ id: 0, rol, percentage: 0, updatedAt: new Date(0) } as RolePricing),
    );
  }

  /** Actualiza (upsert) los porcentajes por rol. Sólo acepta categorías B2B. */
  async saveMany(updates: { rol: UserRole; percentage: number }[]): Promise<RolePricing[]> {
    const result: RolePricing[] = [];
    for (const { rol, percentage } of updates) {
      if (!esCategoriaB2B(rol)) continue;
      let row = await this.rolePricingRepo.findOne({ where: { rol } });
      if (row) {
        row.percentage = percentage;
      } else {
        row = this.rolePricingRepo.create({ rol, percentage });
      }
      result.push(await this.rolePricingRepo.save(row));
    }
    return result;
  }
}
