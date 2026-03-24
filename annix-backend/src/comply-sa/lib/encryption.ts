import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ValueTransformer } from "typeorm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptPhone(plaintext: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPhone(encrypted: string, key: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export const encryptionTransformer: ValueTransformer = {
  to(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const key = process.env.COMPLY_SA_ENCRYPTION_KEY;
    if (!key) {
      return value;
    }
    return encryptPhone(value, key);
  },
  from(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const key = process.env.COMPLY_SA_ENCRYPTION_KEY;
    if (!key) {
      return value;
    }
    return decryptPhone(value, key);
  },
};

export const phoneEncryptionTransformer: ValueTransformer = {
  to(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const key = process.env.COMPLY_SA_ENCRYPTION_KEY;
    if (!key) {
      return value;
    }
    return encryptPhone(value, key);
  },
  from(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const key = process.env.COMPLY_SA_ENCRYPTION_KEY;
    if (!key) {
      return value;
    }
    return decryptPhone(value, key);
  },
};
