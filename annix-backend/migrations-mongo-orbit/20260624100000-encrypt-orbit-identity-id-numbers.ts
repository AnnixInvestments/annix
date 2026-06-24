import { createCipheriv, randomBytes } from "node:crypto";
import type { mongo } from "mongoose";

// Backfills application-layer encryption over historical plaintext SA ID numbers
// stored at identityVerification.idNumber on cv_assistant_profiles, matching the
// runtime lib/field-encryption.ts format (aes-256-gcm, iv|authTag|ciphertext,
// base64, "enc:v1:" tag). Forward-only and idempotent: rows already prefixed
// "enc:v1:" are skipped, and the whole migration no-ops when FIELD_ENCRYPTION_KEY
// is absent (so it can run safely on environments where the secret is not set).

const COLLECTION = "cv_assistant_profiles";
const PREFIX = "enc:v1:";
const KEY_HEX_LENGTH = 64;
const IV_LENGTH = 12;

interface ProfileDoc {
  _id: mongo.ObjectId;
  identityVerification?: { idNumber?: unknown } | null;
}

function encryptionKey(): Buffer | null {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    return null;
  }
  return Buffer.from(hex, "hex");
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export const up = async (db: mongo.Db): Promise<void> => {
  const key = encryptionKey();
  if (!key) {
    return;
  }

  const profiles = (await db
    .collection(COLLECTION)
    .find({ "identityVerification.idNumber": { $exists: true, $nin: [null, ""] } })
    .toArray()) as unknown as ProfileDoc[];

  await profiles.reduce(async (prev, profile) => {
    await prev;
    const idNumber = profile.identityVerification?.idNumber;
    if (typeof idNumber !== "string" || idNumber === "" || idNumber.startsWith(PREFIX)) {
      return;
    }
    await db
      .collection(COLLECTION)
      .updateOne(
        { _id: profile._id },
        { $set: { "identityVerification.idNumber": encrypt(idNumber, key) } },
      );
  }, Promise.resolve());
};

export const down = async (): Promise<void> => {
  // Forward-only: decrypting back to plaintext would re-introduce the exact
  // at-rest exposure this migration removes, so the reverse is intentionally a
  // no-op. Encrypted values remain readable via lib/field-encryption decryptField.
};
