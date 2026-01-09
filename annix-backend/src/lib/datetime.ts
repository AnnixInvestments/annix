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

export const formatDateTime = (
  iso: string | Date | null | undefined,
): string => {
  if (!iso) return '';
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toFormat('dd MMM yyyy HH:mm');
  }
  return DateTime.fromISO(iso).toFormat('dd MMM yyyy HH:mm');
};

export const formatRelative = (
  iso: string | Date | null | undefined,
): string | null => {
  if (!iso) return null;
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toRelative();
  }
  return DateTime.fromISO(iso).toRelative();
};

export const formatShortDate = (
  iso: string | Date | null | undefined,
): string => {
  if (!iso) return '';
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toFormat('dd/MM/yyyy');
  }
  return DateTime.fromISO(iso).toFormat('dd/MM/yyyy');
};

export const formatISODate = (
  iso: string | Date | null | undefined,
): string => {
  if (!iso) return '';
  if (iso instanceof Date) {
    return DateTime.fromJSDate(iso).toISODate() ?? '';
  }
  return DateTime.fromISO(iso).toISODate() ?? '';
};

export const now = (): DateTime => DateTime.now();

export const nowISO = (): string => DateTime.now().toISO() ?? '';

export const nowMillis = (): number => DateTime.now().toMillis();

export const fromISO = (iso: string): DateTime => DateTime.fromISO(iso);

export const fromJSDate = (date: Date): DateTime => DateTime.fromJSDate(date);

export const fromMillis = (millis: number): DateTime =>
  DateTime.fromMillis(millis);

export const isValidISO = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  return DateTime.fromISO(iso).isValid;
};

export const daysBetween = (
  start: string | Date,
  end: string | Date,
): number => {
  const startDt =
    start instanceof Date
      ? DateTime.fromJSDate(start)
      : DateTime.fromISO(start);
  const endDt =
    end instanceof Date ? DateTime.fromJSDate(end) : DateTime.fromISO(end);
  return Math.floor(endDt.diff(startDt, 'days').days);
};

export const isExpired = (iso: string | Date | null | undefined): boolean => {
  if (!iso) return false;
  const dt =
    iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt < DateTime.now();
};

export const addDays = (iso: string | Date, days: number): string => {
  const dt =
    iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.plus({ days }).toISO() ?? '';
};

export const addMinutes = (iso: string | Date, minutes: number): string => {
  const dt =
    iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.plus({ minutes }).toISO() ?? '';
};

export const addHours = (iso: string | Date, hours: number): string => {
  const dt =
    iso instanceof Date ? DateTime.fromJSDate(iso) : DateTime.fromISO(iso);
  return dt.plus({ hours }).toISO() ?? '';
};

export const toJSDate = (iso: string): Date => DateTime.fromISO(iso).toJSDate();

export const generateUniqueId = (): string =>
  `${DateTime.now().toMillis()}-${Math.random().toString(36).substr(2, 9)}`;
