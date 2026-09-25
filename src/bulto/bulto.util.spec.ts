import { describirBultos, presentacionConBultos, splitPresentations } from './bulto.util';

const caja8 = { nombre: 'Caja x 8', unidades: 8 };
const caja24 = { nombre: 'Caja x 24', unidades: 24 };
const pallet48 = { nombre: 'Pallet x 48', unidades: 48 };

describe('describirBultos', () => {
  it('sin bultos o cantidad inválida → vacío', () => {
    expect(describirBultos(12, [])).toBe('');
    expect(describirBultos(12, undefined)).toBe('');
    expect(describirBultos(0, [caja8])).toBe('');
  });
  it('múltiplo exacto', () => {
    expect(describirBultos(16, [caja8])).toBe('2 × Caja x 8');
  });
  it('resto como unidades sueltas', () => {
    expect(describirBultos(12, [caja8])).toBe('1 × Caja x 8 + 4 u. sueltas');
    expect(describirBultos(5, [caja8])).toBe('5 u. sueltas');
  });
  it('varios bultos, de mayor a menor sin importar el orden recibido', () => {
    expect(describirBultos(72, [caja24, pallet48])).toBe('1 × Pallet x 48 + 1 × Caja x 24');
  });
});

describe('presentacionConBultos / splitPresentations', () => {
  it('concatena presentación y desglose', () => {
    expect(presentacionConBultos({ presentation: 'Bidón 1 Litro', quantity: 16, bultos: [caja8] }))
      .toBe('Bidón 1 Litro · 2 × Caja x 8');
    expect(presentacionConBultos({ presentation: 'Balde 20 Litros', quantity: 3 })).toBe('Balde 20 Litros');
  });
  it('split igual al carrito', () => {
    expect(splitPresentations(' Bidón 1 Litro, ,Bidón 4 Litros ')).toEqual(['Bidón 1 Litro', 'Bidón 4 Litros']);
    expect(splitPresentations(null)).toEqual([]);
  });
  it('sin repetidas (producto 54 tiene "Tambor 100 Litros" dos veces)', () => {
    expect(splitPresentations('Tambor 100 Litros, Balde 20 Litros, Tambor 100 Litros'))
      .toEqual(['Tambor 100 Litros', 'Balde 20 Litros']);
  });
});
