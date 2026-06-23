import { ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { fromJSDate, now } from "../lib/datetime";
import { AppScope } from "../rbac/app-scope";
import { App } from "../rbac/entities/app.entity";
import { AppRepository, AppRoleRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import {
  AUTH_CONSTANTS,
  AuthConfigService,
  JwtTokenPayload,
  PasswordService,
  TokenService,
} from "../shared/auth";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { AdminLoginDto, AdminLoginResponseDto, TokenResponseDto } from "./dto/admin-auth.dto";
import { AdminSessionRepository } from "./repositories/admin-session.repository";

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly adminSessionRepo: AdminSessionRepository,
    private readonly userRepo: UserRepository,
    private readonly appRepo: AppRepository,
    private readonly appRoleRepo: AppRoleRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly authConfigService: AuthConfigService,
  ) {}

  async login(
    loginDto: AdminLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    const user = await this.userRepo.findByEmailWithRolesAndScope(
      loginDto.email,
      AppScope.ANNIX_ADMIN,
    );

    if (!user) {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: "auth",
        entityId: undefined,
        newValues: { email: loginDto.email, reason: "user_not_found" },
        ipAddress: clientIp,
        userAgent,
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!this.authConfigService.isPasswordVerificationDisabled()) {
      const isPasswordValid = await this.passwordService.verify(
        loginDto.password,
        user.passwordHash || "",
      );
      if (!isPasswordValid) {
        await this.auditService.log({
          action: AuditAction.ADMIN_LOGIN_FAILED,
          entityType: "auth",
          entityId: user.id,
          performedBy: user,
          newValues: { email: loginDto.email, reason: "invalid_password" },
          ipAddress: clientIp,
          userAgent,
        });
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    const roleNames = user.roles?.map((r) => r.name) || [];

    const hasAccess = await this.checkAppAccess(user.id, roleNames, loginDto.appCode);

    if (!hasAccess.allowed) {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: "auth",
        entityId: user.id,
        performedBy: user,
        newValues: {
          email: loginDto.email,
          reason: "insufficient_permissions",
          appCode: loginDto.appCode,
        },
        ipAddress: clientIp,
        userAgent,
      });
      throw new ForbiddenException(hasAccess.message);
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled() && user.status !== "active") {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: "auth",
        entityId: user.id,
        performedBy: user,
        newValues: {
          email: loginDto.email,
          reason: "account_inactive",
          status: user.status,
        },
        ipAddress: clientIp,
        userAgent,
      });
      throw new ForbiddenException(
        `Your account is ${user.status}. Please contact your administrator.`,
      );
    }

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ days: AUTH_CONSTANTS.ADMIN_SESSION_EXPIRY_DAYS }).toJSDate();

    await this.adminSessionRepo.create({
      userId: user.id,
      sessionToken,
      clientIp,
      userAgent,
      expiresAt,
      isRevoked: false,
    });

    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      type: "admin",
      sessionToken,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload, {
      accessTokenExpiry: AUTH_CONSTANTS.ADMIN_ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiry: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    await this.auditService.log({
      action: AuditAction.ADMIN_LOGIN_SUCCESS,
      entityType: "auth",
      entityId: user.id,
      performedBy: user,
      newValues: { email: user.email, sessionToken },
      ipAddress: clientIp,
      userAgent,
    });

    user.lastLoginAt = now().toJSDate();
    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        roles: roleNames,
      },
    };
  }

  async issueTokensForAuthenticatedUser(
    user: User,
    appCode: string,
    clientIp: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    const roleNames = user.roles?.map((r) => r.name) || [];

    const hasAccess = await this.checkAppAccess(user.id, roleNames, appCode);
    if (!hasAccess.allowed) {
      throw new ForbiddenException(hasAccess.message);
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled() && user.status !== "active") {
      throw new ForbiddenException(
        `Your account is ${user.status}. Please contact your administrator.`,
      );
    }

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ days: AUTH_CONSTANTS.ADMIN_SESSION_EXPIRY_DAYS }).toJSDate();

    await this.adminSessionRepo.create({
      userId: user.id,
      sessionToken,
      clientIp,
      userAgent,
      expiresAt,
      isRevoked: false,
    });

    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      type: "admin",
      sessionToken,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload, {
      accessTokenExpiry: AUTH_CONSTANTS.ADMIN_ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiry: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    user.lastLoginAt = now().toJSDate();
    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        roles: roleNames,
      },
    };
  }

  async logout(
    userId: number,
    sessionToken: string,
    clientIp: string,
    userAgent?: string,
  ): Promise<void> {
    const session = await this.adminSessionRepo.findActiveByUserAndToken(userId, sessionToken);

    if (session) {
      session.isRevoked = true;
      session.revokedAt = now().toJSDate();
      await this.adminSessionRepo.save(session);

      const user = await this.userRepo.findById(userId);

      await this.auditService.log({
        action: AuditAction.ADMIN_LOGOUT,
        entityType: "auth",
        entityId: userId,
        performedBy: user || undefined,
        newValues: { sessionToken },
        ipAddress: clientIp,
        userAgent,
      });
    }
  }

  async validateSession(sessionToken: string): Promise<User> {
    const session = await this.adminSessionRepo.findActiveByTokenWithUser(
      sessionToken,
      now().toJSDate(),
    );

    if (!session) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    const lastActive = session.lastActiveAt
      ? now().diff(fromJSDate(session.lastActiveAt), "minutes").minutes
      : Infinity;

    if (lastActive > 1) {
      session.lastActiveAt = now().toJSDate();
      await this.adminSessionRepo.save(session);
    }

    return session.user;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = await this.tokenService.verifyToken<JwtTokenPayload>(refreshToken);

      if (payload.type !== "admin") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.validateSession(payload.sessionToken);

      const roleNames = user.roles?.map((r) => r.name) || [];

      const newPayload: JwtTokenPayload = {
        sub: user.id,
        email: user.email,
        roles: roleNames,
        type: "admin",
        sessionToken: payload.sessionToken,
      };

      const { accessToken } = await this.tokenService.generateTokenPair(newPayload, {
        accessTokenExpiry: AUTH_CONSTANTS.ADMIN_ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiry: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async currentUser(userId: number): Promise<any> {
    const user = await this.userRepo.findByIdWithRoles(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const roleNames = user.roles?.map((r) => r.name) || [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: roleNames,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async checkAppAccess(
    userId: number,
    roleNames: string[],
    appCode?: string,
  ): Promise<{ allowed: boolean; message: string }> {
    const hasGlobalAccess = roleNames.includes("admin") || roleNames.includes("employee");

    if (!appCode) {
      if (hasGlobalAccess) {
        return { allowed: true, message: "" };
      }
      return {
        allowed: false,
        message: "You do not have permission to access the admin portal",
      };
    }

    if (hasGlobalAccess) {
      return { allowed: true, message: "" };
    }

    const app = await this.appRepo.findActiveByCode(appCode);
    if (!app) {
      return { allowed: false, message: `Application "${appCode}" not found or is inactive` };
    }

    const userAccess = await this.userAppAccessRepo.findOneByUserAndApp(userId, app.id);

    if (!userAccess) {
      const shouldAutoAssignAdmin = await this.autoAssignFirstUserAsAdmin(userId, app);
      if (shouldAutoAssignAdmin) {
        return { allowed: true, message: "" };
      }
      return {
        allowed: false,
        message: `You do not have permission to access the ${app.name}.`,
      };
    }

    if (userAccess.expiresAt && userAccess.expiresAt < now().toJSDate()) {
      return {
        allowed: false,
        message: `Your access to ${app.name} has expired. Please contact your administrator.`,
      };
    }

    return { allowed: true, message: "" };
  }

  private async autoAssignFirstUserAsAdmin(userId: number, app: App): Promise<boolean> {
    const existingAccessCount = await this.userAppAccessRepo.countByAppId(app.id);

    if (existingAccessCount > 0) {
      return false;
    }

    const adminRole = await this.appRoleRepo.findByAppIdAndCode(app.id, "administrator");

    if (!adminRole) {
      this.logger.warn(
        `No administrator role found for app ${app.code}, cannot auto-assign first user`,
      );
      return false;
    }

    await this.userAppAccessRepo.create({
      userId,
      appId: app.id,
      roleId: adminRole.id,
      grantedById: userId,
    });

    this.logger.log(
      `Auto-assigned administrator role to first user (userId: ${userId}) for app ${app.code}`,
    );

    return true;
  }
}
