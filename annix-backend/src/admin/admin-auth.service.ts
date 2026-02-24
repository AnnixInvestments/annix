import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { fromJSDate, now } from "../lib/datetime";
import {
  AUTH_CONSTANTS,
  AuthConfigService,
  JwtTokenPayload,
  PasswordService,
  TokenService,
} from "../shared/auth";
import { User } from "../user/entities/user.entity";
import { AdminLoginDto, AdminLoginResponseDto, TokenResponseDto } from "./dto/admin-auth.dto";
import { AdminSession } from "./entities/admin-session.entity";

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminSession)
    private readonly adminSessionRepo: Repository<AdminSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    const user = await this.userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles")
      .where("LOWER(user.email) = LOWER(:email)", { email: loginDto.email })
      .getOne();

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
        user.password || "",
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
    const hasAdminAccess = roleNames.includes("admin") || roleNames.includes("employee");

    if (!hasAdminAccess) {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: "auth",
        entityId: user.id,
        performedBy: user,
        newValues: {
          email: loginDto.email,
          reason: "insufficient_permissions",
        },
        ipAddress: clientIp,
        userAgent,
      });
      throw new ForbiddenException("You do not have permission to access the admin portal");
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

    const session = this.adminSessionRepo.create({
      userId: user.id,
      sessionToken,
      clientIp,
      userAgent,
      expiresAt,
      isRevoked: false,
    });
    await this.adminSessionRepo.save(session);

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

  async logout(
    userId: number,
    sessionToken: string,
    clientIp: string,
    userAgent?: string,
  ): Promise<void> {
    const session = await this.adminSessionRepo.findOne({
      where: { userId, sessionToken, isRevoked: false },
    });

    if (session) {
      session.isRevoked = true;
      session.revokedAt = now().toJSDate();
      await this.adminSessionRepo.save(session);

      const user = await this.userRepo.findOne({ where: { id: userId } });

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
    const session = await this.adminSessionRepo.findOne({
      where: {
        sessionToken,
        isRevoked: false,
        expiresAt: MoreThan(now().toJSDate()),
      },
      relations: ["user", "user.roles"],
    });

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
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["roles"],
    });

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
}
