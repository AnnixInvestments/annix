'use client';

// eslint-disable-next-line no-restricted-imports
import { DateTime, Duration, Interval, Settings } from 'luxon';

Settings.defaultZone = 'Africa/Johannesburg';

export { DateTime, Duration, Interval };

export const TIMEZONE = 'Africa/Johannesburg';

export const formatDate = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toFormat('dd MMM yyyy');
  }
  return DateTime.fromISO(iso).toFormat('dd MMM yyyy');
};

export const formatDateZA = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  const dt = iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.toLocaleString({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateLongZA = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  const dt = iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.toLocaleString({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toFormat('dd MMM yyyy HH:mm');
  }
  return DateTime.fromISO(iso).toFormat('dd MMM yyyy HH:mm');
};

export const formatDateTimeZA = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  const dt = iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.toLocaleString({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTimeZA = (iso: string | null | undefined): string => {
  if (!iso) return '';
  return DateTime.fromISO(iso).toLocaleString({
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelative = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  return DateTime.fromISO(iso).toRelative();
};

export const formatShortDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  return DateTime.fromISO(iso).toFormat('dd/MM/yyyy');
};

export const formatISODate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  return DateTime.fromISO(iso).toISODate() ?? '';
};

export const now = (): DateTime => DateTime.now();

export const nowISO = (): string => DateTime.now().toISO() ?? '';

export const nowMillis = (): number => DateTime.now().toMillis();

export const fromISO = (iso: string): DateTime => DateTime.fromISO(iso);

export const fromJSDate = (date: Date): DateTime => DateTime.fromJSDate(date);

export const fromMillis = (millis: number): DateTime => DateTime.fromMillis(millis);

export const isValidISO = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  return DateTime.fromISO(iso).isValid;
};

export const daysBetween = (start: string, end: string): number => {
  const startDt = DateTime.fromISO(start);
  const endDt = DateTime.fromISO(end);
  return Math.floor(endDt.diff(startDt, 'days').days);
};

export const isExpired = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  return DateTime.fromISO(iso) < DateTime.now();
};

export const isFuture = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  return DateTime.fromISO(iso) > DateTime.now();
};

export const addDays = (iso: string, days: number): string => {
  return DateTime.fromISO(iso).plus({ days }).toISO() ?? '';
};

export const addDaysFromNow = (days: number): string => {
  return DateTime.now().plus({ days }).toISO() ?? '';
};

export const addDaysFromNowISODate = (days: number): string => {
  return DateTime.now().plus({ days }).toISODate() ?? '';
};

export const addHours = (iso: string, hours: number): string => {
  return DateTime.fromISO(iso).plus({ hours }).toISO() ?? '';
};

export const addMinutes = (iso: string, minutes: number): string => {
  return DateTime.fromISO(iso).plus({ minutes }).toISO() ?? '';
};

export const toJSDate = (iso: string): Date => DateTime.fromISO(iso).toJSDate();

export const generateUniqueId = (): string => `${DateTime.now().toMillis()}-${Math.random().toString(36).substr(2, 9)}`;

export const getYear = (): number => DateTime.now().year;

export const formatIcsDate = (iso: string): string => {
  return DateTime.fromISO(iso).toFormat("yyyyMMdd'T'HHmmss'Z'");
};
