import { createHash } from "node:crypto";

/**
 * Resolves the client IP from a request behind Fly.io's proxy: the first
 * `x-forwarded-for` hop, then `req.ip`, then the raw socket address, falling
 * back to "unknown". Shared so the throttler key and any audit IP hashing read
 * the same value (don't reimplement the chain per call-site).
 */
export function clientIpFromRequest(req: Record<string, unknown>): string {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const forwarded = headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : null;
  const socket = req.socket as { remoteAddress?: string } | undefined;
  return (
    forwardedIp?.trim() || (req.ip as string | undefined) || socket?.remoteAddress || "unknown"
  );
}

/**
 * One-way SHA-256 of a client IP, truncated for storage. For audit correlation
 * of anonymous writes only (grouping repeat sources) — never store or log the
 * raw IP alongside it.
 */
export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
