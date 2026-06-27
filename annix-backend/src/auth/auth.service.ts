import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { now } from "../lib/datetime";
import { maskEmail } from "../lib/pii-log";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { PasswordService } from "../shared/auth/password.service";
import { UserRepository } from "../user/user.repository";
import { JwtPayload } from "./jwt.strategy";
import { LoginAttemptService } from "./login-attempt.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyPasswordHash: Promise<string>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly accessRepo: UserAppAccessRepository,
    private readonly appRepo: AppRepository,
    private readonly auditService: AuditService,
    private readonly loginAttempts: LoginAttemptService,
  ) {
    this.dummyPasswordHash = this.passwordService.hashSimple(randomBytes(32).toString("hex"));
  }

  async validateUser(email: string, password: string, ip?: string): Promise<any> {
    const clientIp = ip ?? "unknown";
    await this.loginAttempts.assertNotLocked(email, clientIp);

    const user = await this.userRepo.findByEmailWithRoles(email);
    if (!user) {
      await this.passwordService.verify(password, await this.dummyPasswordHash);
      await this.loginAttempts.recordFailure(email, clientIp);
      this.auditLoginFailed(email, ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verify(password, user.passwordHash || "");

    if (isPasswordValid) {
      await this.loginAttempts.recordSuccess(email, clientIp);
      const { passwordHash, ...result } = user;
      return result;
    }

    await this.loginAttempts.recordFailure(email, clientIp);
    this.auditLoginFailed(email, ip);
    throw new UnauthorizedException("Invalid credentials");
  }

  private auditLoginFailed(email: string, ip?: string): void {
    this.auditService
      .log({
        action: AuditAction.LOGIN_FAILED,
        entityType: "auth",
        metadata: { email: maskEmail(email) },
        ipAddress: ip,
      })
      .catch((error: unknown) =>
        this.logger.warn(`Failed to write login-failed audit event: ${this.errorMessage(error)}`),
      );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async login(user: any, ip?: string) {
    if (user?.id) {
      const fresh = await this.userRepo.findById(user.id);
      if (fresh) {
        fresh.lastLoginAt = now().toJSDate();
        await this.userRepo.save(fresh);
      }
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles ? user.roles.map((r) => r.name) : [],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: "8h",
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: "7d",
      }),
    ]);

    this.auditService
      .log({
        userId: user.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "auth",
        metadata: { email: maskEmail(user.email) },
        ipAddress: ip,
      })
      .catch((error: unknown) =>
        this.logger.warn(`Failed to write login-success audit event: ${this.errorMessage(error)}`),
      );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  async refreshToken(refreshToken: string, ip?: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const user = await this.userRepo.findByIdWithRoles(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      this.auditService
        .log({
          userId: payload.sub,
          action: AuditAction.TOKEN_REFRESH,
          entityType: "auth",
          metadata: { email: maskEmail(user.email) },
          ipAddress: ip,
        })
        .catch((error: unknown) =>
          this.logger.warn(
            `Failed to write token-refresh audit event: ${this.errorMessage(error)}`,
          ),
        );

      return this.login(user, ip);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async invitePreview(
    token: string,
  ): Promise<{ email: string; firstName: string | null; apps: string[] }> {
    const user = await this.userRepo.findByValidResetPasswordToken(token, now().toJSDate());
    if (!user) {
      throw new BadRequestException("This invitation link is invalid or has expired.");
    }
    return {
      email: user.email,
      firstName: user.firstName ?? null,
      apps: await this.appsFor(user.id),
    };
  }

  private async appsFor(userId: number): Promise<string[]> {
    const access = await this.accessRepo.findManyWhere({ userId });
    const apps = await Promise.all(access.map((row) => this.appRepo.findById(row.appId)));
    return apps.filter((app): app is NonNullable<typeof app> => app != null).map((app) => app.code);
  }

  async acceptInvite(token: string, password: string, ip?: string): Promise<{ message: string }> {
    if (!password || password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long.");
    }
    const user = await this.userRepo.findByValidResetPasswordToken(token, now().toJSDate());
    if (!user) {
      throw new BadRequestException("This invitation link is invalid or has expired.");
    }
    user.passwordHash = await this.passwordService.hashSimple(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    if (user.status === "invited") {
      user.status = "active";
    }
    await this.userRepo.save(user);

    this.auditService
      .log({
        userId: user.id,
        action: AuditAction.INVITE_ACCEPTED,
        entityType: "auth",
        metadata: { email: maskEmail(user.email) },
        ipAddress: ip,
      })
      .catch((error: unknown) =>
        this.logger.warn(
          `Failed to write invite-accepted audit event: ${this.errorMessage(error)}`,
        ),
      );

    return { message: "Your account is ready. You can now sign in with your new password." };
  }
}
