import { createHmac, timingSafeEqual } from "node:crypto";
import { nowMillis } from "../lib/datetime";

interface ConsentTokenPayload {
  userId: number;
  exp: number;
}

const DEFAULT_TTL_DAYS = 7;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadSegment: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

export function createConsentToken(
  userId: number,
  secret: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
): string {
  const payload: ConsentTokenPayload = {
    userId,
    exp: nowMillis() + ttlDays * MILLIS_PER_DAY,
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  return `${payloadSegment}.${sign(payloadSegment, secret)}`;
}

export function verifyConsentToken(token: string, secret: string): { userId: number } | null {
  if (!token || !secret) {
    return null;
  }
  const segments = token.split(".");
  if (segments.length !== 2) {
    return null;
  }
  const [payloadSegment, signatureSegment] = segments;
  const expectedSignature = sign(payloadSegment, secret);
  const provided = Buffer.from(signatureSegment, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }
  const payload = parsePayload(payloadSegment);
  if (!payload) {
    return null;
  }
  if (payload.exp <= nowMillis()) {
    return null;
  }
  return { userId: payload.userId };
}

function parsePayload(payloadSegment: string): ConsentTokenPayload | null {
  try {
    const decoded = JSON.parse(base64UrlDecode(payloadSegment)) as Partial<ConsentTokenPayload>;
    if (typeof decoded.userId !== "number" || typeof decoded.exp !== "number") {
      return null;
    }
    return { userId: decoded.userId, exp: decoded.exp };
  } catch {
    return null;
  }
}
