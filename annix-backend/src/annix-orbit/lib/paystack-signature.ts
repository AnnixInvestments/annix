import { createHmac, timingSafeEqual } from "node:crypto";

export function paystackSignature(rawBody: Buffer | string, secretKey: string): string {
  return createHmac("sha512", secretKey).update(rawBody).digest("hex");
}

export function verifyPaystackSignature(
  rawBody: Buffer | string | null | undefined,
  providedSignature: string | null | undefined,
  secretKey: string | null | undefined,
): boolean {
  if (!rawBody || !providedSignature || !secretKey) {
    return false;
  }
  const expected = Buffer.from(paystackSignature(rawBody, secretKey), "utf8");
  const provided = Buffer.from(providedSignature, "utf8");
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}
