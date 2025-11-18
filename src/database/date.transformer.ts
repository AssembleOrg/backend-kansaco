import { ValueTransformer } from 'typeorm';
import { DateTime } from 'luxon';
import { toLuxonDate } from '../helpers/date.helper';

const TIMEZONE = 'America/Argentina/Buenos_Aires'; // GMT-3

/**
 * Transformer for TypeORM date columns to use Luxon DateTime in GMT-3
 * Converts Date to DateTime when reading from DB
 * Converts DateTime to Date when writing to DB
 */
export const dateTransformer: ValueTransformer = {
  to(value: DateTime | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof DateTime) {
      return value.setZone(TIMEZONE).toJSDate();
    }
    if (value instanceof Date) {
      return DateTime.fromJSDate(value).setZone(TIMEZONE).toJSDate();
    }
    return null;
  },
  from(value: Date | null | undefined): DateTime | null {
    if (!value) return null;
    return toLuxonDate(value);
  },
};


