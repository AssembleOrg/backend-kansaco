/**
 * Opciones de presentación de un producto: split por coma + trim, sin repetidas
 * (hay textos cargados con la misma presentación dos veces).
 */
export const splitPresentations = (presentation?: string | null): string[] => [
  ...new Set(
    (presentation ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0),
  ),
];

type BultoLike = { nombre: string; unidades: number };

/**
 * Desglose de una cantidad en unidades según los bultos disponibles, de mayor a menor.
 * describirBultos(72, [Pallet x 48, Caja x 24]) → "1 × Pallet x 48 + 1 × Caja x 24"
 * describirBultos(12, [Caja x 8])               → "1 × Caja x 8 + 4 u. sueltas"
 * Sin bultos → "" (se vende por unidad, como siempre).
 * ponytail: greedy mayor→menor; con tamaños no múltiplos (24/36) puede dejar resto
 * aunque exista combinación exacta. Mismo algoritmo en frontend-kansaco/lib/bultos.ts.
 */
export const describirBultos = (quantity: number, bultos?: BultoLike[] | null): string => {
  if (!bultos?.length || !(quantity > 0)) return '';
  const partes: string[] = [];
  let resto = quantity;
  for (const b of [...bultos].sort((a, c) => c.unidades - a.unidades)) {
    const n = Math.floor(resto / b.unidades);
    if (n > 0) {
      partes.push(`${n} × ${b.nombre}`);
      resto -= n * b.unidades;
    }
  }
  if (resto > 0) partes.push(`${resto} u. sueltas`);
  return partes.join(' + ');
};

/** "Bidón 1 Litro · SKU 0050002700" para PDF y emails (los bultos van en la cantidad). */
export const presentacionConSkus = (item: { presentation?: string; skus?: string[] }): string => {
  const skus = item.skus?.length ? `SKU ${item.skus.join(' / ')}` : '';
  return [item.presentation, skus].filter(Boolean).join(' · ');
};

/** Columna cantidad: "4 × Caja x 8 (32 u.)"; sin bultos → "32". */
export const cantidadConBultos = (quantity: number, bultos?: BultoLike[] | null): string => {
  const desc = describirBultos(quantity, bultos);
  return desc ? `${desc} (${quantity} u.)` : String(quantity);
};
