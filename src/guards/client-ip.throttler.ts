import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard que identifica al visitante por su IP real.
 *
 * Los formularios públicos pegan a `/api/*` del frontend Next, que reenvía la
 * request al backend con un `fetch` server-side. Para el backend, todas esas
 * requests salen de la misma IP (el contenedor de Next), así que el throttler
 * por defecto las contaría juntas: un solo bot dejaría el formulario
 * inutilizable para todos los visitantes.
 *
 * Se usa el primer hop de `x-forwarded-for`, que es el cliente original.
 *
 * Alcance: se aplica sólo a los controllers que lo declaran con `@UseGuards`;
 * el `APP_GUARD` global permanece intacto.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Nunca debe lanzar: una excepción acá tumbaría el endpoint entero.
    try {
      const forwarded = req?.headers?.['x-forwarded-for'];

      const raw = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
          ? forwarded
          : undefined;

      if (raw) {
        // Formato: "cliente, proxy1, proxy2" — el primero es el visitante.
        const client = raw.split(',')[0]?.trim();
        if (client) {
          // IPv4 mapeada a IPv6 (::ffff:1.2.3.4) → normalizar para que una
          // misma IP no cuente como dos trackers distintos.
          return client.replace(/^::ffff:/i, '');
        }
      }

      const fallback = req?.ip || req?.socket?.remoteAddress;
      return typeof fallback === 'string'
        ? fallback.replace(/^::ffff:/i, '')
        : 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
