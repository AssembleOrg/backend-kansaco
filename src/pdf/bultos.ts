/**
 * Cantidad en bultos para el presupuesto. El bulto sale de la presentación
 * cargada en el catálogo ("Caja 8 X 1 L" = bultos de 8): 16 unidades → "2",
 * 19 → "2 +3u", 3 → "3u". La presentación al lado ya dice de qué es el bulto.
 * Sin bulto en la presentación, queda la cantidad tal cual.
 */

// "8 X 1 L", "4x4L", "12 x 500 ml": unidades por bulto × contenido de cada una.
const BULTO_RE =
  /(\d+)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litros?|kg|kgs|g|gr|ml|cc)\b/i;

export function bultoDe(
  presentacion?: string | null,
): { unidades: number; nombre: string } | null {
  const m = presentacion?.match(BULTO_RE);
  const unidades = m ? Number(m[1]) : NaN;
  return unidades > 1 ? { unidades, nombre: `${unidades}x${m![2]}` } : null;
}

export function cantidadEnBultos(
  cantidad: number,
  presentacion?: string | null,
): string {
  const bulto = bultoDe(presentacion);
  if (!bulto || !Number.isInteger(cantidad)) return String(cantidad);
  const bultos = Math.floor(cantidad / bulto.unidades);
  const sueltas = cantidad % bulto.unidades;
  if (!bultos) return `${sueltas}u`;
  return sueltas ? `${bultos} +${sueltas}u` : String(bultos);
}
