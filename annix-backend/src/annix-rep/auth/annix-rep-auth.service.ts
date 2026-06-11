import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { now } from "../../lib/datetime";
import { AUTH_CONSTANTS, PasswordService, TokenService } from "../../shared/auth";
import { SessionInvalidationReason } from "../../shared/enums";
import { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { UserRoleRepository } from "../../user-roles/user-roles.repository";
import { RepProfileRepository } from "../rep-profile/rep-profile.repository";
import { AnnixRepSessionRepository } from "./annix-rep-session.repository";
import {
  AnnixRepAuthResponseDto,
  AnnixRepLoginDto,
  AnnixRepProfileResponseDto,
  AnnixRepRefreshTokenDto,
  AnnixRepRegisterDto,
} from "./dto";
import { AnnixRepSession } from "./entities";
import { OAuthLoginProvider, OAuthProvider } from "./oauth-login.provider";

export interface AnnixRepJwtPayload {
  sub: number;
  email: string;
  type: "annixRep";
  sessionToken: string;
  annixRepUserId: number;
}

@Injectable()
export class AnnixRepAuthService {
  private readonly logger = new Logger(AnnixRepAuthService.name);

  constructor(
    private readonly sessionRepo: AnnixRepSessionRepository,
    private readonly userRepo: UserRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly repProfileRepo: RepProfileRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly oauthProvider: OAuthLoginProvider,
  ) {}

  async register(
    dto: AnnixRepRegisterDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    const existingUser = await this.userRepo.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const annixRepRole =
      (await this.userRoleRepo.findByName("annixRep")) ??
      (await this.userRoleRepo.create({ name: "annixRep" }));

    const { passwordHash } = await this.passwordService.hash(dto.password);

    const savedUser = await this.userRepo.create({
      username: dto.email,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: [annixRepRole],
    });

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    await this.sessionRepo.create({
      userId: savedUser.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });

    const payload: AnnixRepJwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      type: "annixRep",
      sessionToken,
      annixRepUserId: savedUser.id,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      userId: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName || dto.firstName,
      lastName: savedUser.lastName || dto.lastName,
      setupCompleted: false,
    };
  }

  async login(
    dto: AnnixRepLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    const user = await this.userRepo.findByEmailWithRoles(dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash || "",
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const hasAnnixRepRole = user.roles?.some((role) => role.name === "annixRep");
    if (!hasAnnixRepRole) {
      this.logger.warn(`Login attempt for user ${dto.email} without annixRep role`);
      throw new UnauthorizedException(
        "This account is not registered for Annix Pulse. Please register first.",
      );
    }

    user.lastLoginAt = now().toJSDate();
    await this.userRepo.save(user);

    await this.invalidateAllUserSessions(user.id, SessionInvalidationReason.NEW_LOGIN);

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    await this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });

    const payload: AnnixRepJwtPayload = {
      sub: user.id,
      email: user.email,
      type: "annixRep",
      sessionToken,
      annixRepUserId: user.id,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    const repProfile = await this.repProfileRepo.findByUserId(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      setupCompleted: repProfile?.setupCompleted ?? false,
    };
  }

  async issueTokensForAuthenticatedUser(
    user: User,
    clientIp: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hasAnnixRepRole = user.roles?.some((role) => role.name === "annixRep");
    if (!hasAnnixRepRole) {
      throw new UnauthorizedException(
        "This account is not registered for Annix Pulse. Please register first.",
      );
    }

    user.lastLoginAt = now().toJSDate();
    await this.userRepo.save(user);

    await this.invalidateAllUserSessions(user.id, SessionInvalidationReason.NEW_LOGIN);

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    await this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });

    const payload: AnnixRepJwtPayload = {
      sub: user.id,
      email: user.email,
      type: "annixRep",
      sessionToken,
      annixRepUserId: user.id,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);
    return { accessToken, refreshToken };
  }

  async logout(sessionToken: string): Promise<void> {
    const session = await this.sessionRepo.findActiveByToken(sessionToken);

    if (session) {
      session.isActive = false;
      session.invalidatedAt = now().toJSDate();
      session.invalidationReason = SessionInvalidationReason.LOGOUT;
      await this.sessionRepo.save(session);
    }
  }

  async refreshSession(
    dto: AnnixRepRefreshTokenDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    try {
      const payload = await this.tokenService.verifyToken<AnnixRepJwtPayload>(dto.refreshToken);

      if (payload.type !== "annixRep") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const newSessionToken = uuidv4();
      const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

      await this.sessionRepo.updateActiveUserSessions(user.id, {
        sessionToken: newSessionToken,
        lastActivity: now().toJSDate(),
        expiresAt,
      });

      const newPayload: AnnixRepJwtPayload = {
        sub: user.id,
        email: user.email,
        type: "annixRep",
        sessionToken: newSessionToken,
        annixRepUserId: user.id,
      };

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(newPayload);

      const repProfile = await this.repProfileRepo.findByUserId(user.id);

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        userId: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        setupCompleted: repProfile?.setupCompleted ?? false,
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async profile(userId: number): Promise<AnnixRepProfileResponseDto> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const repProfile = await this.repProfileRepo.findByUserId(userId);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      setupCompleted: repProfile?.setupCompleted ?? false,
    };
  }

  async checkEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.userRepo.findOneByEmail(email);
    return !existingUser;
  }

  async verifySession(sessionToken: string): Promise<AnnixRepSession | null> {
    const session = await this.sessionRepo.findActiveByTokenWithUser(sessionToken);

    if (!session) return null;

    if (now().toJSDate() > session.expiresAt) {
      session.isActive = false;
      session.invalidatedAt = now().toJSDate();
      session.invalidationReason = SessionInvalidationReason.EXPIRED;
      await this.sessionRepo.save(session);
      return null;
    }

    session.lastActivity = now().toJSDate();
    await this.sessionRepo.save(session);

    return session;
  }

  private async invalidateAllUserSessions(
    userId: number,
    reason: SessionInvalidationReason,
  ): Promise<void> {
    await this.sessionRepo.updateActiveUserSessions(userId, {
      isActive: false,
      invalidatedAt: now().toJSDate(),
      invalidationReason: reason,
    });
  }

  isOAuthProviderConfigured(provider: OAuthProvider): boolean {
    return this.oauthProvider.isProviderConfigured(provider);
  }

  oauthAuthorizationUrl(
    provider: OAuthProvider,
    redirectUri: string,
    state: string,
  ): string | null {
    return this.oauthProvider.authorizationUrl(provider, redirectUri, state);
  }

  async oauthLogin(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    clientIp: string,
    userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    const result = await this.oauthProvider.exchangeCode(provider, code, redirectUri);

    if (!result) {
      throw new UnauthorizedException("OAuth authentication failed");
    }

    const existingOAuthUser = await this.userRepo.findByEmailWithRoles(result.email);

    const annixRepRole =
      (await this.userRoleRepo.findByName("annixRep")) ??
      (await this.userRoleRepo.create({ name: "annixRep" }));

    const user = await (async () => {
      if (!existingOAuthUser) {
        const saved = await this.userRepo.create({
          username: result.email,
          email: result.email,
          passwordHash: null,
          firstName: result.firstName || result.email.split("@")[0],
          lastName: result.lastName || "",
          roles: [annixRepRole],
          oauthProvider: provider,
          oauthId: result.oauthId,
        });
        this.logger.log(`Created new OAuth user: ${result.email} via ${provider}`);
        return saved;
      } else {
        const hasAnnixRepRole = existingOAuthUser.roles?.some((role) => role.name === "annixRep");
        if (!hasAnnixRepRole) {
          existingOAuthUser.roles = [...(existingOAuthUser.roles || []), annixRepRole];
          await this.userRepo.save(existingOAuthUser);
        }

        if (!existingOAuthUser.oauthProvider) {
          existingOAuthUser.oauthProvider = provider;
          existingOAuthUser.oauthId = result.oauthId;
          await this.userRepo.save(existingOAuthUser);
        }
        return existingOAuthUser;
      }
    })();

    await this.invalidateAllUserSessions(user.id, SessionInvalidationReason.NEW_LOGIN);

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    await this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });

    const payload: AnnixRepJwtPayload = {
      sub: user.id,
      email: user.email,
      type: "annixRep",
      sessionToken,
      annixRepUserId: user.id,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    const repProfile = await this.repProfileRepo.findByUserId(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      userId: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      setupCompleted: repProfile?.setupCompleted ?? false,
    };
  }
}
