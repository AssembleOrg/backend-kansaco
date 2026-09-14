import { OrderDireccion, ModalidadEnvio } from './order.entity';

/** Etiqueta legible de la modalidad, compartida por PDF, email y (espejo) el front. */
export const MODALIDAD_LABEL: Record<ModalidadEnvio, string> = {
  RETIRO: 'Retiro en planta',
  FLETE: 'Flete / Transporte local',
  EXPRESO: 'Expreso / Larga distancia',
};

export function modalidadLabel(modalidad: string): string {
  return MODALIDAD_LABEL[modalidad as ModalidadEnvio] || modalidad;
}

/** Formatea una dirección estructurada a una línea legible. undefined si vacía. */
export function formatDireccion(dir?: OrderDireccion): string | undefined {
  if (!dir) return undefined;
  const partes = [dir.calle, dir.localidad, dir.provincia, dir.codigoPostal]
    .map((p) => p?.trim())
    .filter(Boolean);
  return partes.length ? partes.join(', ') : undefined;
}
