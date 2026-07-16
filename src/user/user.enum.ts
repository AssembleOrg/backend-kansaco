export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENTE_MINORISTA = 'CLIENTE_MINORISTA',
  CLIENTE_MAYORISTA = 'CLIENTE_MAYORISTA',
  ASISTENTE = 'ASISTENTE',
  SUBMAYORISTA = 'SUBMAYORISTA',
  REVENDEDOR = 'REVENDEDOR',
  TALLER = 'TALLER',
}

/**
 * Categorías comerciales B2B que operan (ven precios y pueden comprar).
 * El resto (CLIENTE_MINORISTA = pendiente/sin categoría, ADMIN, ASISTENTE)
 * NO opera como cliente: Kansaco es B2B puro, no vende minorista.
 */
export const B2B_ROLES: readonly UserRole[] = [
  UserRole.CLIENTE_MAYORISTA,
  UserRole.SUBMAYORISTA,
  UserRole.REVENDEDOR,
  UserRole.TALLER,
];

export const esCategoriaB2B = (rol: UserRole | null | undefined): boolean =>
  !!rol && B2B_ROLES.includes(rol);
