import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthConfigService {
  constructor(private readonly configService: ConfigService) {}

  isPasswordVerificationDisabled(): boolean {
    return this.configService.get("DISABLE_PASSWORD_VERIFICATION") === "true";
  }

  isEmailVerificationDisabled(): boolean {
    return this.configService.get("DISABLE_EMAIL_VERIFICATION") === "true";
  }

  isAccountStatusCheckDisabled(): boolean {
    return this.configService.get("DISABLE_ACCOUNT_STATUS_CHECK") === "true";
  }

  isDeviceFingerprintDisabled(): boolean {
    return this.configService.get("DISABLE_DEVICE_FINGERPRINT") === "true";
  }

  isIpMismatchCheckDisabled(): boolean {
    return this.configService.get("DISABLE_IP_MISMATCH_CHECK") === "true";
  }

  isRateLimitingDisabled(): boolean {
    return this.configService.get("DISABLE_RATE_LIMITING") === "true";
  }

  jwtSecret(): string {
    return this.configService.get<string>("JWT_SECRET") || "";
  }

  uploadDir(): string {
    return this.configService.get<string>("UPLOAD_DIR") || "./uploads";
  }
}
