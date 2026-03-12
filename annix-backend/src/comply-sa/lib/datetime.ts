import { DateTime, Duration, Interval, Settings } from "luxon";

Settings.defaultZone = "Africa/Johannesburg";

export { DateTime, Duration, Interval };

export const now = (): DateTime => DateTime.now();

export const nowISO = (): string => DateTime.now().toISO()!;

export const nowMillis = (): number => DateTime.now().toMillis();

export const fromISO = (iso: string): DateTime => DateTime.fromISO(iso);

export const fromJSDate = (date: Date): DateTime => DateTime.fromJSDate(date);

export const fromMillis = (millis: number): DateTime => DateTime.fromMillis(millis);

export const daysBetween = (start: DateTime, end: DateTime): number =>
  Math.floor(end.diff(start, "days").days);

export const addDays = (dt: DateTime, days: number): DateTime => dt.plus({ days });

export const formatDateZA = (dt: DateTime): string => dt.toFormat("dd/MM/yyyy");

export const formatDateLongZA = (dt: DateTime): string => dt.toFormat("dd MMMM yyyy");

export const isExpired = (isoDate: string): boolean => fromISO(isoDate) < now();

export const isValidISO = (value: string): boolean => fromISO(value).isValid;
