import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { now } from "../../lib/datetime";
import { AUTH_CONSTANTS, PasswordService, TokenService } from "../../shared/auth";
import { SessionInvalidationReason } from "../../shared/enums";
import { User } from "../../user/entities/user.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import {
  AnnixRepAuthResponseDto,
  AnnixRepLoginDto,
  AnnixRepProfileResponseDto,
  AnnixRepRefreshTokenDto,
  AnnixRepRegisterDto,
} from "./dto";
import { AnnixRepSession } from "./entities";

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
    @InjectRepository(AnnixRepSession)
    private readonly sessionRepo: Repository<AnnixRepSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RepProfile)
    private readonly repProfileRepo: Repository<RepProfile>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(
    dto: AnnixRepRegisterDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    let annixRepRole = await this.userRoleRepo.findOne({
      where: { name: "annixRep" },
    });
    if (!annixRepRole) {
      annixRepRole = this.userRoleRepo.create({ name: "annixRep" });
      annixRepRole = await this.userRoleRepo.save(annixRepRole);
    }

    const { hash: hashedPassword, salt } = await this.passwordService.hash(dto.password);

    const user = this.userRepo.create({
      username: dto.email,
      email: dto.email,
      password: hashedPassword,
      salt,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: [annixRepRole],
    });
    const savedUser = await this.userRepo.save(user);

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    const session = this.sessionRepo.create({
      userId: savedUser.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });
    await this.sessionRepo.save(session);

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
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ["roles"],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verify(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const hasAnnixRepRole = user.roles?.some((role) => role.name === "annixRep");
    if (!hasAnnixRepRole) {
      this.logger.warn(`Login attempt for user ${dto.email} without annixRep role`);
      throw new UnauthorizedException(
        "This account is not registered for Annix Rep. Please register first.",
      );
    }

    await this.invalidateAllUserSessions(user.id, SessionInvalidationReason.NEW_LOGIN);

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    const session = this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    });
    await this.sessionRepo.save(session);

    const payload: AnnixRepJwtPayload = {
      sub: user.id,
      email: user.email,
      type: "annixRep",
      sessionToken,
      annixRepUserId: user.id,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    const repProfile = await this.repProfileRepo.findOne({
      where: { userId: user.id },
    });

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

  async logout(sessionToken: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken, isActive: true },
    });

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

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const newSessionToken = uuidv4();
      const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

      await this.sessionRepo.update(
        { userId: user.id, isActive: true },
        {
          sessionToken: newSessionToken,
          lastActivity: now().toJSDate(),
          expiresAt,
        },
      );

      const newPayload: AnnixRepJwtPayload = {
        sub: user.id,
        email: user.email,
        type: "annixRep",
        sessionToken: newSessionToken,
        annixRepUserId: user.id,
      };

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(newPayload);

      const repProfile = await this.repProfileRepo.findOne({
        where: { userId: user.id },
      });

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
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const repProfile = await this.repProfileRepo.findOne({
      where: { userId },
    });

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      setupCompleted: repProfile?.setupCompleted ?? false,
    };
  }

  async checkEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.userRepo.findOne({
      where: { email },
    });
    return !existingUser;
  }

  async verifySession(sessionToken: string): Promise<AnnixRepSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken, isActive: true },
      relations: ["user"],
    });

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
    await this.sessionRepo.update(
      { userId, isActive: true },
      {
        isActive: false,
        invalidatedAt: now().toJSDate(),
        invalidationReason: reason,
      },
    );
  }
}
