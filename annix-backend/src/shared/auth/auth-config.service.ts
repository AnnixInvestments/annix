import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthConfigService {
  constructor(private readonly configService: ConfigService) {}

  // Auth/rate-limit bypasses are DEV-only — always ignored in production so a
  // stray DISABLE_* env var can never weaken a live deployment (#402). The boot
  // guard (assertProductionSecurityConfig) additionally refuses to start prod if
  // any is set, so this is defense-in-depth.
  private bypassEnabled(flag: string): boolean {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return this.configService.get(flag) === "true";
  }

  isPasswordVerificationDisabled(): boolean {
    return this.bypassEnabled("DISABLE_PASSWORD_VERIFICATION");
  }

  isEmailVerificationDisabled(): boolean {
    return this.bypassEnabled("DISABLE_EMAIL_VERIFICATION");
  }

  isAccountStatusCheckDisabled(): boolean {
    return this.bypassEnabled("DISABLE_ACCOUNT_STATUS_CHECK");
  }

  isDeviceFingerprintDisabled(): boolean {
    return this.bypassEnabled("DISABLE_DEVICE_FINGERPRINT");
  }

  isIpMismatchCheckDisabled(): boolean {
    return this.bypassEnabled("DISABLE_IP_MISMATCH_CHECK");
  }

  isRateLimitingDisabled(): boolean {
    return this.bypassEnabled("DISABLE_RATE_LIMITING");
  }

  jwtSecret(): string {
    return this.configService.getOrThrow<string>("JWT_SECRET");
  }

  uploadDir(): string {
    return this.configService.get<string>("UPLOAD_DIR") || "./uploads";
  }
}
