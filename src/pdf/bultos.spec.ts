import { bultoDe, cantidadEnBultos } from './bultos';

describe('cantidadEnBultos', () => {
  const caja8 = 'Bidón 1 Litro · 2 x Caja 8 X 1 L · SKU 0050003750 / 0520003750';

  it('lee el bulto de la presentación', () => {
    expect(bultoDe(caja8)).toEqual({ unidades: 8, nombre: '8x1' });
    expect(bultoDe('Caja 4x4L')).toEqual({ unidades: 4, nombre: '4x4' });
    expect(bultoDe('Pack 12 x 500 ml')).toEqual({ unidades: 12, nombre: '12x500' });
  });

  it('sin bulto en la presentación, deja la cantidad como está', () => {
    expect(bultoDe('Bidón 4 Litros · SKU 0510002650')).toBeNull();
    expect(bultoDe('Balde 20 Litros · SKU 0080002650')).toBeNull();
    expect(cantidadEnBultos(12, 'Bidón 4 Litros · SKU 0510002650')).toBe('12');
    expect(cantidadEnBultos(6, null)).toBe('6');
  });

  it('muestra cuántos bultos y las unidades sueltas', () => {
    expect(cantidadEnBultos(16, caja8)).toBe('2');
    expect(cantidadEnBultos(8, caja8)).toBe('1');
    expect(cantidadEnBultos(6, 'Caja 4x4L')).toBe('1 +2u');
    expect(cantidadEnBultos(18, 'Caja 4x4L')).toBe('4 +2u');
    expect(cantidadEnBultos(3, caja8)).toBe('3u');
  });
});
