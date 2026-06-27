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

// Fly apps that serve REAL users. The single fly.toml bakes NODE_ENV=production,
// but the live `test` deployment (annix-app-test) overrides NODE_ENV to a
// non-production value via a Fly secret while still serving real Orbit/AU users.
// Fly injects FLY_APP_NAME into every machine, so it is the reliable
// per-deployment signal. The staging scratch app (annix-app-staging) and local
// dev are intentionally excluded — auth/rate-limit bypasses are legitimate there.
const REAL_USER_FLY_APPS = ["annix-app", "annix-app-test"];

/**
 * True for any deployment that serves real users — production OR the live `test`
 * deployment. Used to fail-closed on both the boot guard and the auth bypass
 * flags so DISABLE_* can never take effect anywhere real users sign in (#402).
 */
export function servesRealUsers(): boolean {
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  const flyAppName = process.env.FLY_APP_NAME;
  return flyAppName != null && REAL_USER_FLY_APPS.includes(flyAppName);
}

/**
 * Fail-closed boot guard for production secrets and bypass flags (#402).
 * Refuses to start a real-user deployment unless JWT_SECRET and
 * FIELD_ENCRYPTION_KEY are properly configured, and unless every DISABLE_*
 * auth/rate-limit bypass is off — so a misconfigured deploy can never silently
 * fall back to a weak secret, store PII in plaintext, or ship with
 * authentication disabled.
 */
export function assertProductionSecurityConfig(): void {
  if (!servesRealUsers()) {
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
