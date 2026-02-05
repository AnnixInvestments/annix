import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ObjectLiteral, Repository, MoreThanOrEqual } from 'typeorm';
import { now } from '../../lib/datetime';
import { AUTH_CONSTANTS } from './auth.constants';
import { LogLoginAttemptData } from './auth.interfaces';

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  async checkLoginAttempts<T extends ObjectLiteral>(
    repo: Repository<T>,
    email: string,
  ): Promise<void> {
    try {
      const lockoutTime = now()
        .minus({ minutes: AUTH_CONSTANTS.LOGIN_LOCKOUT_MINUTES })
        .toJSDate();

      const recentAttempts = await repo.count({
        where: {
          email,
          success: false,
          attemptTime: MoreThanOrEqual(lockoutTime),
        } as any,
      });

      if (recentAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          `Too many failed login attempts. Please try again in ${AUTH_CONSTANTS.LOGIN_LOCKOUT_MINUTES} minutes.`,
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        'Failed to check login attempts (table may not exist): ' +
          error.message,
      );
    }
  }

  async logLoginAttempt<T extends ObjectLiteral, TProfileId extends string>(
    repo: Repository<T>,
    data: LogLoginAttemptData<TProfileId>,
  ): Promise<void> {
    try {
      const attemptData: Record<string, any> = {
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

      const attempt = repo.create(attemptData as any);
      await repo.save(attempt);
    } catch (error) {
      this.logger.warn(
        'Failed to log login attempt (table may not exist): ' + error.message,
      );
    }
  }
}
