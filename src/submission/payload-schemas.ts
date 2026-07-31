import { SubmissionType } from './submission.enum';

/**
 * Whitelist de claves aceptadas en `payload`, por tipo de formulario.
 *
 * El input del cliente NUNCA se copia con spread: se recorre esta lista y se
 * toma sólo lo declarado. Así una request no puede inflar el jsonb con claves
 * arbitrarias ni contaminar el prototipo.
 */
export const PAYLOAD_KEYS: Record<SubmissionType, readonly string[]> = {
  [SubmissionType.MAYORISTA]: [
    'cuit',
    'domicilio',
    'codigoPostal',
    'zonaDistribucion',
    'afip',
  ],
  [SubmissionType.TRABAJO]: ['puesto'],
  [SubmissionType.LUBRI_EXPERTO]: ['vehiculo'],
};

/** Campos de selección: se validan contra su lista cerrada de opciones. */
export const PAYLOAD_ENUMS: Record<string, readonly string[]> = {
  afip: [
    'No inscripto',
    'Monotributista',
    'Responsable Inscripto',
    'Persona Jurídica',
  ],
  puesto: [
    'Ventas',
    'Almacén / Depósito',
    'Administración',
    'Reparto / Logística',
    'Producción',
    'Otro',
  ],
};

/** Campos obligatorios del payload según el tipo. */
export const PAYLOAD_REQUIRED: Partial<Record<SubmissionType, readonly string[]>> =
  {
    [SubmissionType.MAYORISTA]: ['afip'],
    [SubmissionType.TRABAJO]: ['puesto'],
  };

export const PAYLOAD_MAX_LENGTH = 300;
