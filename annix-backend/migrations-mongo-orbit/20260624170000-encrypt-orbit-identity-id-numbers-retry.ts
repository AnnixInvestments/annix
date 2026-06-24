import { createCipheriv, randomBytes } from "node:crypto";
import type { mongo } from "mongoose";

// Retry of 20260624100000-encrypt-orbit-identity-id-numbers. That migration ran
// in the release_command BEFORE FIELD_ENCRYPTION_KEY was set on the Fly apps, so
// it no-opped and was recorded as applied — leaving any pre-existing plaintext
// identityVerification.idNumber values unencrypted. Now that the key is live,
// this fresh migration backfills them on the next deploy. Idempotent (skips
// values already prefixed "enc:v1:") and a no-op when the key is absent, so it
// is safe to run on every environment regardless of state.

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
  // Forward-only: decrypting back to plaintext would re-introduce the at-rest
  // exposure this migration removes, so the reverse is intentionally a no-op.
};
