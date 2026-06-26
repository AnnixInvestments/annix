const AUTH_BYPASS_FLAGS = [
  "DISABLE_PASSWORD_VERIFICATION",
  "DISABLE_EMAIL_VERIFICATION",
  "DISABLE_ACCOUNT_STATUS_CHECK",
  "DISABLE_DEVICE_FINGERPRINT",
  "DISABLE_IP_MISMATCH_CHECK",
  "DISABLE_RATE_LIMITING",
] as const;

const MIN_JWT_SECRET_LENGTH = 32;
const FIELD_ENCRYPTION_KEY_HEX_LENGTH = 64;

/**
 * Fail-closed boot guard for production secrets and bypass flags (#402).
 * Refuses to start production unless JWT_SECRET and FIELD_ENCRYPTION_KEY are
 * properly configured, and unless every DISABLE_* auth/rate-limit bypass is off
 * — so a misconfigured deploy can never silently fall back to a weak secret,
 * store PII in plaintext, or ship with authentication disabled.
 */
export function assertProductionSecurityConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret == null || jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters long in production`,
    );
  } else if (/change-?me|changeme|dev-secret/i.test(jwtSecret)) {
    errors.push("JWT_SECRET looks like a development placeholder — set a real secret in production");
  }

  const encryptionKey = process.env.FIELD_ENCRYPTION_KEY;
  if (encryptionKey == null || !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    errors.push(
      `FIELD_ENCRYPTION_KEY must be set and exactly ${FIELD_ENCRYPTION_KEY_HEX_LENGTH} hex characters in production`,
    );
  }

  const enabledBypasses = AUTH_BYPASS_FLAGS.filter((flag) => process.env[flag] === "true");
  if (enabledBypasses.length > 0) {
    errors.push(
      `auth/rate-limit bypass flags must never be enabled in production: ${enabledBypasses.join(", ")}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Refusing to boot — production security configuration is invalid:\n - ${errors.join("\n - ")}`,
    );
  }
}
