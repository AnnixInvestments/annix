import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function whatsAppSignature(rawBody: Buffer | string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

export function verifyWhatsAppSignature(
  rawBody: Buffer | string | null | undefined,
  headerValue: string | null | undefined,
  appSecret: string | null | undefined,
): boolean {
  if (!rawBody || !headerValue || !appSecret) {
    return false;
  }
  const providedHex = headerValue.startsWith(SIGNATURE_PREFIX)
    ? headerValue.slice(SIGNATURE_PREFIX.length)
    : headerValue;
  const expected = Buffer.from(whatsAppSignature(rawBody, appSecret), "utf8");
  const provided = Buffer.from(providedHex, "utf8");
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}
