/**
 * Tiny helpers for SWC-safe nullable handling. CLAUDE.md forbids using `??`
 * or `||` directly on member/optional member access — these helpers wrap
 * the access in a function call so the LHS of any nullish/coalescing
 * operator is always a plain identifier.
 */

export function valOr<T>(value: T | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value;
}

export function strOr(value: string | null | undefined, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return value;
}

export function numOr<T extends number | undefined>(
  value: number | null | undefined,
  fallback: T,
): number | T {
  if (value === null || value === undefined) return fallback;
  return value;
}

export function arrOr<T>(value: readonly T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return [...value];
}
