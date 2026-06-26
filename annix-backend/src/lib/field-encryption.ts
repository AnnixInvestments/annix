import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encryptionKey(): Buffer | null {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    return null;
  }
  return Buffer.from(hex, "hex");
}

export function fieldEncryptionEnabled(): boolean {
  return encryptionKey() !== null;
}

export function isEncryptedField(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptField(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === "" || isEncryptedField(plaintext)) {
    return plaintext;
  }
  const key = encryptionKey();
  if (!key) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not configured (must be 64 hex chars) — refusing to store sensitive data in plaintext (#402). Callers that can tolerate no encryption must check fieldEncryptionEnabled() first.",
    );
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptField(stored: string | null): string | null {
  if (stored === null || !isEncryptedField(stored)) {
    return stored;
  }
  const key = encryptionKey();
  if (!key) {
    return stored;
  }
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return stored;
  }
}
