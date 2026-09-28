import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from './order.enum';
import { UserRole } from '../user/user.enum';
import { dayRangeAR } from '../helpers/date.helper';
import { STATUS_LABEL } from './order-export';

export interface OrderFilters {
  status?: OrderStatus[];
  /**
   * Fecha sobre la que aplica el rango. Default: si se filtra por estado, la fecha
   * en que pasó a ese estado; si no, la fecha en que se hizo el pedido.
   */
  dateField?: 'status' | 'created';
  /** Límites ya resueltos en hora AR (ver dayRangeAR). */
  start?: Date;
  end?: Date;
  provincia?: string;
  /** Categoría actual de la cuenta que hizo el pedido (Taller, Lubricentro…). */
  categoria?: UserRole;
  q?: string;
  /** Orden de la lista por la fecha del rango. Default: más nuevos primero. */
  orden?: 'asc' | 'desc';
}

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Query string → filtros validados (400 si algo no cierra). */
export function parseOrderFilters(q: Record<string, string>): OrderFilters {
  const status = q.status
    ? q.status.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const validStatus = Object.values(OrderStatus) as string[];
  if (status?.some((s) => !validStatus.includes(s))) {
    throw new BadRequestException(`status inválido. Valores: ${validStatus.join(', ')}`);
  }
  if (q.dateField && q.dateField !== 'status' && q.dateField !== 'created') {
    throw new BadRequestException('dateField debe ser status o created');
  }
  if (q.categoria && !(Object.values(UserRole) as string[]).includes(q.categoria)) {
    throw new BadRequestException('categoria inválida');
  }
  if (q.orden && q.orden !== 'asc' && q.orden !== 'desc') {
    throw new BadRequestException('orden debe ser asc o desc');
  }
  const range = dayRangeAR(q.from || undefined, q.to || undefined);
  if (!range) {
    throw new BadRequestException('Rango de fechas inválido (formato yyyy-MM-dd y desde <= hasta)');
  }
  return {
    status: status as OrderStatus[] | undefined,
    dateField:
      (q.dateField as OrderFilters['dateField']) || (status?.length ? 'status' : 'created'),
    ...range,
    provincia: q.provincia?.trim() || undefined,
    categoria: (q.categoria as UserRole) || undefined,
    q: q.q?.trim() || undefined,
    orden: q.orden === 'asc' ? 'asc' : 'desc',
  };
}

export const CATEGORIA_LABEL: Partial<Record<UserRole, string>> = {
  CLIENTE_MINORISTA: 'Sin categoría',
  CLIENTE_MAYORISTA: 'Mayorista',
  SUBMAYORISTA: 'Submayorista',
  REVENDEDOR: 'Revendedor',
  TALLER: 'Taller',
  LUBRICENTRO: 'Lubricentro',
  ADMIN: 'Admin',
  ASISTENTE: 'Asistente',
};

/** Texto legible de los filtros para el encabezado del PDF. */
export function describeFilters(q: Record<string, string>, f: OrderFilters): string {
  const ar = (d: string) => d.split('-').reverse().join('/');
  const campo = f.dateField === 'created' ? 'Hechos' : 'Pasaron a ese estado';
  const rango =
    q.from && q.to ? `${campo}: ${ar(q.from)} al ${ar(q.to)}`
    : q.from ? `${campo}: desde ${ar(q.from)}`
    : q.to ? `${campo}: hasta ${ar(q.to)}`
    : 'Todas las fechas';
  return [
    f.status?.length ? f.status.map((s) => STATUS_LABEL[s]).join(', ') : 'Todos los estados',
    rango,
    f.provincia,
    f.categoria ? `Categoría: ${CATEGORIA_LABEL[f.categoria] ?? f.categoria}` : '',
    f.q ? `Búsqueda: "${f.q}"` : '',
  ].filter(Boolean).join(' · ');
}
