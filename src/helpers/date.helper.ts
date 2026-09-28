import { DateTime } from 'luxon';

const TIMEZONE = 'America/Argentina/Buenos_Aires'; // GMT-3

/**
 * Get current date/time in GMT-3 timezone
 */
export function now(): DateTime {
  return DateTime.now().setZone(TIMEZONE);
}

/**
 * Get current date as JavaScript Date object (for database compatibility)
 */
export function nowAsDate(): Date {
  return now().toJSDate();
}

/**
 * Format date to Spanish locale string
 * Handles null/undefined values safely
 */
export function formatDateSpanish(date: DateTime | Date | null | undefined): string {
  if (!date) return '';
  
  const dt = date instanceof Date ? DateTime.fromJSDate(date).setZone(TIMEZONE) : date;
  if (!dt || !dt.isValid) return '';
  
  return dt.setLocale('es').toLocaleString({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date to ISO string
 * Handles null/undefined values safely
 */
export function formatDateISO(date: DateTime | Date | null | undefined): string | null {
  if (!date) return null;
  
  const dt = date instanceof Date ? DateTime.fromJSDate(date).setZone(TIMEZONE) : date;
  if (!dt || !dt.isValid) return null;
  
  return dt.toISO();
}

/**
 * Convert JavaScript Date to Luxon DateTime in GMT-3
 */
export function toLuxonDate(date: Date): DateTime {
  return DateTime.fromJSDate(date).setZone(TIMEZONE);
}

/**
 * Create DateTime from ISO string in GMT-3
 */
export function fromISO(iso: string): DateTime {
  return DateTime.fromISO(iso).setZone(TIMEZONE);
}

/**
 * Rango de días calendario AR ('yyyy-MM-dd', ambos inclusivos) → [start, end)
 * para comparar con `>= start AND < end`. null si alguna fecha es inválida o from > to.
 */
export function dayRangeAR(
  from?: string,
  to?: string,
): { start?: Date; end?: Date } | null {
  const parse = (d: string) => DateTime.fromFormat(d, 'yyyy-MM-dd', { zone: TIMEZONE });
  const start = from ? parse(from) : undefined;
  const end = to ? parse(to).plus({ days: 1 }) : undefined;
  if (start && !start.isValid) return null;
  if (end && !end.isValid) return null;
  if (start && end && start >= end) return null;
  return { start: start?.toJSDate(), end: end?.toJSDate() };
}



