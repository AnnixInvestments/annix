import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

type BinaryLike = Buffer | Uint8Array | { buffer: Buffer | Uint8Array } | { value: () => Buffer };

function toBuffer(input: BinaryLike): Buffer {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }
  const candidate = input as { buffer?: unknown; value?: () => unknown };
  if (
    candidate.buffer &&
    (Buffer.isBuffer(candidate.buffer) || candidate.buffer instanceof Uint8Array)
  ) {
    return Buffer.from(candidate.buffer as Buffer | Uint8Array);
  }
  if (typeof candidate.value === "function") {
    const value = candidate.value();
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return Buffer.from(value as Buffer | Uint8Array);
    }
  }
  throw new TypeError("decrypt: encryptedData must be a Buffer-like value");
}

export function decrypt(encryptedData: BinaryLike, keyHex: string): string {
  const buffer = toBuffer(encryptedData);
  const key = Buffer.from(keyHex, "hex");
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
