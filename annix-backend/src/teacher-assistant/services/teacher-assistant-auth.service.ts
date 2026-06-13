import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RbacBridgeService } from "../../rbac/rbac-bridge.service";
import { AUTH_CONSTANTS } from "../../shared/auth/auth.constants";
import { PasswordService } from "../../shared/auth/password.service";
import { UserRepository } from "../../user/user.repository";
import { TeacherAssistantUser } from "../entities/teacher-assistant-user.entity";
import { TeacherAssistantUserRepository } from "../teacher-assistant-user.repository";

const TOKEN_TTL_SECONDS = AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60;
const TOKEN_TYPE = "teacher-assistant";
const REFRESH_TOKEN_TYPE = "refresh";
// Identity scope for the core-User anchor (issue #311 step 4.1). A
// `teacher-assistant`-scoped row never collides with a customer/orbit
// account on the same email — Mongo permits one account per scope —
// so anchoring never merges identities.
const TA_APP_SCOPE = "teacher-assistant";
const TA_APP_CODE = "teacher-assistant";
const TA_ANCHOR_ROLE = "viewer";

export interface TeacherAssistantAuthUser {
  id: number;
  email: string;
  name: string;
  schoolName: string | null;
}

export interface TeacherAssistantAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: TeacherAssistantAuthUser;
}

export interface TeacherAssistantRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TeacherAssistantAuthService {
  private readonly logger = new Logger(TeacherAssistantAuthService.name);

  constructor(
    private readonly userRepo: TeacherAssistantUserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly coreUserRepo: UserRepository,
    private readonly rbacBridge: RbacBridgeService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    name: string;
    schoolName?: string | null;
  }): Promise<TeacherAssistantAuthResult> {
    const email = normaliseEmail(input.email);
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException("An account with that email already exists.");
    }
    const passwordHash = await this.passwordService.hashSimple(input.password);
    const trimmedName = input.name.trim();
    // Step 4.1 (#311): anchor to a core User first, then stamp its id
    // onto the standalone row. Additive — login (below) still verifies
    // against this table's passwordHash, not the core user.
    const anchorUserId = await this.ensureCoreAnchor(email, trimmedName);
    const saved = await this.userRepo.create({
      email,
      passwordHash,
      name: trimmedName,
      schoolName: input.schoolName?.trim() || null,
      userId: anchorUserId,
    });
    if (anchorUserId !== null) {
      await this.rbacBridge.ensureAppAccess(anchorUserId, TA_APP_CODE, TA_ANCHOR_ROLE);
    }
    this.logger.log(`Registered new teacher: ${saved.email} (id=${saved.id})`);
    return this.tokenFor(saved);
  }

  // Find-or-create the `teacher-assistant`-scoped core User anchor for
  // this email. Never throws into registration — a failed anchor just
  // leaves userId null for the backfill migration to pick up later.
  private async ensureCoreAnchor(email: string, name: string): Promise<number | null> {
    try {
      const existing = await this.coreUserRepo.findOneByEmailAndScope(email, TA_APP_SCOPE);
      if (existing) {
        return existing.id;
      }
      const parts = name.split(/\s+/).filter((part) => part.length > 0);
      const firstName = parts[0] ?? name;
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
      const created = await this.coreUserRepo.create({
        email,
        firstName,
        lastName,
        appScope: TA_APP_SCOPE,
        emailVerified: false,
        status: "active",
      });
      return created.id;
    } catch (error) {
      this.logger.warn(
        `Failed to anchor Teacher Assistant '${email}' to core user: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async login(email: string, password: string): Promise<TeacherAssistantAuthResult> {
    const user = await this.userRepo.findByEmail(normaliseEmail(email));
    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const valid = await this.passwordService.verify(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    return this.tokenFor(user);
  }

  async findById(id: number): Promise<TeacherAssistantUser | null> {
    return this.userRepo.findById(id);
  }

  verifyToken(token: string): { sub: number; email: string; name: string; type: string } {
    return this.jwtService.verify(token, { secret: this.jwtSecret() });
  }

  async refresh(refreshTokenStr: string): Promise<TeacherAssistantRefreshResult> {
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        type?: string;
        tokenType?: string;
      }>(refreshTokenStr, { secret: this.jwtSecret() });
      if (payload.tokenType !== REFRESH_TOKEN_TYPE || payload.type !== TOKEN_TYPE) {
        throw new UnauthorizedException("Invalid token type.");
      }
      const user = await this.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found.");
      }
      return {
        accessToken: this.signAccessToken(user),
        refreshToken: this.signRefreshToken(user),
        expiresIn: TOKEN_TTL_SECONDS,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
  }

  toAuthUser(user: TeacherAssistantUser): TeacherAssistantAuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      schoolName: user.schoolName,
    };
  }

  private tokenFor(user: TeacherAssistantUser): TeacherAssistantAuthResult {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
      expiresIn: TOKEN_TTL_SECONDS,
      user: this.toAuthUser(user),
    };
  }

  private signAccessToken(user: TeacherAssistantUser): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        type: TOKEN_TYPE,
      },
      { secret: this.jwtSecret(), expiresIn: TOKEN_TTL_SECONDS },
    );
  }

  private signRefreshToken(user: TeacherAssistantUser): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        type: TOKEN_TYPE,
        tokenType: REFRESH_TOKEN_TYPE,
      },
      { secret: this.jwtSecret(), expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY },
    );
  }

  private jwtSecret(): string {
    return this.configService.get<string>("JWT_SECRET", "annix-dev-secret-change-me");
  }
}

function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}
