import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';

/**
 * Variante no estricta de AuthGuard: si hay un Bearer token válido setea
 * request.user; si falta o es inválido, deja pasar como anónimo (request.user
 * queda undefined). Se usa en endpoints públicos que quieren personalizar la
 * respuesta según el rol cuando el usuario está logueado (p. ej. precio por rol).
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) return true;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return true;

    try {
      const payload = await this.authService.verifyToken(token);
      request.user = {
        id: payload.id,
        email: payload.email,
        rol: payload.rol,
      };
    } catch {
      // Token inválido/expirado: seguir como anónimo.
    }
    return true;
  }
}
