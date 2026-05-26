import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import type { DeepPartial, PersistedEntity } from "../../lib/persistence/crud-repository";
import { AUTH_CONSTANTS } from "./auth.constants";
import { LogLoginAttemptData } from "./auth.interfaces";
import { AuthConfigService } from "./auth-config.service";
import type { AuthLoginAttemptRepository } from "./auth-login-attempt.repository";

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  constructor(private readonly authConfigService: AuthConfigService) {}

  async checkLoginAttempts<T extends PersistedEntity>(
    repo: AuthLoginAttemptRepository<T>,
    email: string,
  ): Promise<void> {
    if (this.authConfigService.isRateLimitingDisabled()) {
      return;
    }

    try {
      const lockoutTime = now().minus({ minutes: AUTH_CONSTANTS.LOGIN_LOCKOUT_MINUTES }).toJSDate();

      const recentAttempts = await repo.countRecentFailures(email, lockoutTime);

      if (recentAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          `Too many failed login attempts. Please try again in ${AUTH_CONSTANTS.LOGIN_LOCKOUT_MINUTES} minutes.`,
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Failed to check login attempts (table may not exist): ${error.message}`);
    }
  }

  async logLoginAttempt<T extends PersistedEntity, TProfileId extends string>(
    repo: AuthLoginAttemptRepository<T>,
    data: LogLoginAttemptData<TProfileId>,
  ): Promise<void> {
    try {
      const attemptData: Record<string, unknown> = {
        email: data.email,
        success: data.success,
        deviceFingerprint: data.deviceFingerprint,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        ipMismatchWarning: data.ipMismatchWarning ?? false,
      };

      if (data.profileId !== null) {
        attemptData[data.profileIdField] = data.profileId;
      }

      if (data.failureReason !== null) {
        attemptData.failureReason = data.failureReason;
      }

      await repo.create(attemptData as DeepPartial<T>);
    } catch (error) {
      this.logger.warn(`Failed to log login attempt (table may not exist): ${error.message}`);
    }
  }
}
