import { createHmac, timingSafeEqual } from "node:crypto";

export function signFilePath(normalizedPath: string, expMillis: number, secret: string): string {
  return createHmac("sha256", secret).update(`${normalizedPath}\n${expMillis}`).digest("hex");
}

export function verifyFileUrlSignature(
  normalizedPath: string | null | undefined,
  exp: string | number | null | undefined,
  sig: string | null | undefined,
  secret: string | null | undefined,
  nowMillis: number,
): boolean {
  if (!normalizedPath || !exp || !sig || !secret) {
    return false;
  }

  const expMillis = typeof exp === "number" ? exp : Number.parseInt(exp, 10);
  if (!Number.isFinite(expMillis) || expMillis <= nowMillis) {
    return false;
  }

  const expected = Buffer.from(signFilePath(normalizedPath, expMillis, secret), "utf8");
  const provided = Buffer.from(sig, "utf8");
  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
