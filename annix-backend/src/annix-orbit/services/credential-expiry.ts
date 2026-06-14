// Pure expiry classification shared by the Skills Passport service and
// the dashboard compliance-alert summary (issue #362 phase 3). Dates
// are ISO `yyyy-MM-dd` strings, which sort lexicographically, so plain
// string comparison is correct and timezone-free.

export type CredentialExpiryStatus = "none" | "valid" | "expiring" | "expired";

export const DEFAULT_EXPIRY_WARN_DAYS = 30;

export function addDaysIso(today: string, days: number): string {
  const [y, m, d] = today.split("-").map((part) => Number.parseInt(part, 10));
  const base = Date.UTC(y, m - 1, d);
  const shifted = new Date(base + days * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

// Normalise a date value to a `yyyy-MM-dd` string. The Mongo schema
// persists expiry/issue dates as `Date`, so a lean read hands these
// functions a Date at runtime even though the entity type says string —
// coerce both forms (and full ISO datetimes) to a plain date.
export function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

export function classifyCredentialExpiry(
  expiresAt: string | Date | null | undefined,
  today: string,
  warnWithinDays: number = DEFAULT_EXPIRY_WARN_DAYS,
): CredentialExpiryStatus {
  const expiry = toIsoDate(expiresAt);
  if (!expiry) {
    return "none";
  }
  if (expiry < today) {
    return "expired";
  }
  if (expiry <= addDaysIso(today, warnWithinDays)) {
    return "expiring";
  }
  return "valid";
}

// A credential counts toward the dashboard "expiring documents" alert
// when it is already expired OR expires within the warning window.
export function isExpiringOrExpired(
  expiresAt: string | Date | null | undefined,
  today: string,
  warnWithinDays: number = DEFAULT_EXPIRY_WARN_DAYS,
): boolean {
  const status = classifyCredentialExpiry(expiresAt, today, warnWithinDays);
  return status === "expiring" || status === "expired";
}
