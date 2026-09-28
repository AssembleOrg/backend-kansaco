import { BadRequestException } from '@nestjs/common';
import { dayRangeAR } from '../helpers/date.helper';
import { escapeLike, parseOrderFilters } from './order-filters';

describe('dayRangeAR', () => {
  it('agosto completo en hora AR: [01/08 00:00 -03, 01/09 00:00 -03)', () => {
    const r = dayRangeAR('2026-08-01', '2026-08-31')!;
    expect(r.start!.toISOString()).toBe('2026-08-01T03:00:00.000Z');
    expect(r.end!.toISOString()).toBe('2026-09-01T03:00:00.000Z');
  });
  it('un pedido del 31/08 23:30 AR entra', () => {
    const r = dayRangeAR('2026-08-01', '2026-08-31')!;
    const d = new Date('2026-09-01T02:30:00.000Z'); // 31/08 23:30 -03
    expect(d >= r.start! && d < r.end!).toBe(true);
  });
  it('un solo día y bordes abiertos', () => {
    expect(dayRangeAR('2026-08-10', '2026-08-10')).not.toBeNull();
    expect(dayRangeAR(undefined, undefined)).toEqual({ start: undefined, end: undefined });
    expect(dayRangeAR('2026-08-10')!.end).toBeUndefined();
  });
  it('inválidos → null', () => {
    expect(dayRangeAR('2026-08-31', '2026-08-01')).toBeNull();
    expect(dayRangeAR('31/08/2026')).toBeNull();
    expect(dayRangeAR('2026-02-30')).toBeNull();
  });
});

describe('parseOrderFilters', () => {
  it('orden: default desc, acepta asc', () => {
    expect(parseOrderFilters({}).orden).toBe('desc');
    expect(parseOrderFilters({ orden: 'asc' }).orden).toBe('asc');
  });
  it('sin estado, el rango aplica a la fecha de creación', () => {
    expect(parseOrderFilters({ from: '2026-08-01' }).dateField).toBe('created');
    expect(parseOrderFilters({ status: 'COMPLETADO', dateField: 'created' }).dateField).toBe('created');
  });
  it('parsea estados múltiples; con estado, el rango aplica a la fecha de estado', () => {
    const f = parseOrderFilters({ status: 'COMPLETADO,CANCELADO', from: '2026-08-01', to: '2026-08-31' });
    expect(f.status).toEqual(['COMPLETADO', 'CANCELADO']);
    expect(f.dateField).toBe('status');
    expect(f.start).toBeInstanceOf(Date);
  });
  it('rechaza estado, dateField o rango inválidos', () => {
    expect(() => parseOrderFilters({ status: 'BORRADO' })).toThrow(BadRequestException);
    expect(() => parseOrderFilters({ dateField: 'updated' })).toThrow(BadRequestException);
    expect(() => parseOrderFilters({ categoria: 'PIRATA' })).toThrow(BadRequestException);
    expect(() => parseOrderFilters({ orden: 'x' })).toThrow(BadRequestException);
    expect(() => parseOrderFilters({ from: '2026-09-01', to: '2026-08-01' })).toThrow(BadRequestException);
  });
});

describe('escapeLike', () => {
  it('escapa comodines', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
