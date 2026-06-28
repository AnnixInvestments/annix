/**
 * Canonical per-app identity scopes (issue #389).
 *
 * The `user` collection is SHARED across every Annix app, partitioned by the
 * string `appScope` column. Each app has its OWN registration + login: the same
 * email may hold a SEPARATE account per app, and provisioning into app B must
 * never read, mutate, or authenticate a record owned by app A.
 *
 * These string values are the single source of truth — code that filters by
 * scope AND the backfill migration that stamps existing rows MUST agree on
 * them, so they are centralised here. Do NOT change an existing value: Orbit
 * (`orbit:*`) and Teacher Assistant (`teacher-assistant`) are already live.
 *
 * FROZEN VALUES: these strings are persisted in production user rows and are
 * protected by scripts/check-appscope-frozen.ts. Add new keys when needed, but
 * never rename or repurpose an existing value.
 */
export const AppScope = {
  FORGE_CUSTOMER: "forge:customer",
  FORGE_SUPPLIER: "forge:supplier",
  ANNIX_ADMIN: "annix:admin",
  PULSE_REP: "pulse:rep",
  SENTINEL_USER: "sentinel:user",
  STOCK_CONTROL: "stock-control",
  ORBIT_SEEKER: "orbit:seeker",
  ORBIT_COMPANY: "orbit:company",
  ORBIT_RECRUITER: "orbit:recruiter",
  ORBIT_STUDENT: "orbit:student",
  TEACHER_ASSISTANT: "teacher-assistant",
} as const;

export type AppScopeValue = (typeof AppScope)[keyof typeof AppScope];

/**
 * True when `appScope` belongs to the given app family. `prefix` is matched
 * either exactly (`teacher-assistant`) or as a `<prefix>:` namespace
 * (`orbit` matches `orbit:seeker`, `orbit:company`, …).
 */
export function isScopeOf(appScope: string | null | undefined, prefix: string): boolean {
  if (typeof appScope !== "string" || appScope.length === 0) {
    return false;
  }
  return appScope === prefix || appScope.startsWith(`${prefix}:`);
}

/**
 * Maps a portal/app code (as resolved from the request host or login DTO) to
 * the canonical identity scope that owns that portal's user records. Returns
 * null for portals whose users are not partitioned by a single scope (e.g.
 * Orbit, where the scope depends on the user type) or for unknown codes.
 */
export function scopeForAppCode(appCode: string | null | undefined): AppScopeValue | null {
  if (!appCode) {
    return null;
  }
  if (appCode === "customer") {
    return AppScope.FORGE_CUSTOMER;
  }
  if (appCode === "supplier") {
    return AppScope.FORGE_SUPPLIER;
  }
  if (appCode === "admin" || appCode === "au-rubber") {
    return AppScope.ANNIX_ADMIN;
  }
  if (appCode === "annix-rep" || appCode === "fieldflow") {
    return AppScope.PULSE_REP;
  }
  if (appCode === "annix-sentinel") {
    return AppScope.SENTINEL_USER;
  }
  if (appCode === "stock-control" || appCode === "ops") {
    return AppScope.STOCK_CONTROL;
  }
  if (appCode === "teacher-assistant") {
    return AppScope.TEACHER_ASSISTANT;
  }
  return null;
}
