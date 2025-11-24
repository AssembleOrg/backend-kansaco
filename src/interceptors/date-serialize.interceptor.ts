import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { formatDateISO } from '../helpers/date.helper';

/**
 * Interceptor to serialize DateTime objects to ISO strings in GMT-3
 */
@Injectable()
export class DateSerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.serializeDates(data);
      }),
    );
  }

  private serializeDates(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (DateTime.isDateTime(data)) {
      return formatDateISO(data);
    }

    if (data instanceof Date) {
      return formatDateISO(DateTime.fromJSDate(data));
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeDates(item));
    }

    if (typeof data === 'object') {
      const serialized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          serialized[key] = this.serializeDates(data[key]);
        }
      }
      return serialized;
    }

    return data;
  }
}



