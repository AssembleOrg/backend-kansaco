import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

/**
 * Asigna un `x-request-id` (genera uno si el cliente no lo manda), lo expone
 * en la response y loguea una línea por request con método, url, status y
 * duración. Útil para correlacionar 429s y errores en logs.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (!req || typeof req.method !== 'string') {
      return next.handle();
    }

    const incoming = req.headers?.['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();

    req.requestId = requestId;
    if (typeof res?.setHeader === 'function') {
      res.setHeader('x-request-id', requestId);
    }

    const startedAt = process.hrtime.bigint();
    const method = req.method;
    const url = req.originalUrl || req.url || '';

    return next.handle().pipe(
      tap({
        next: () => this.log(method, url, res?.statusCode ?? 0, startedAt, requestId),
        error: (err) => {
          const status =
            (err && typeof err.getStatus === 'function' && err.getStatus()) ||
            res?.statusCode ||
            500;
          this.log(method, url, status, startedAt, requestId, err?.message);
        },
      }),
    );
  }

  private log(
    method: string,
    url: string,
    status: number,
    startedAt: bigint,
    requestId: string,
    errorMessage?: string,
  ) {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const base = `[${requestId}] ${method} ${url} ${status} ${durationMs}ms`;
    if (status >= 500) this.logger.error(errorMessage ? `${base} - ${errorMessage}` : base);
    else if (status === 429 || status >= 400) this.logger.warn(base);
    else this.logger.log(base);
  }
}
