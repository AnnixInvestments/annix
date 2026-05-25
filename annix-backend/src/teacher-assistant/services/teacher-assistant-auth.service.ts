import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AUTH_CONSTANTS } from "../../shared/auth/auth.constants";
import { PasswordService } from "../../shared/auth/password.service";
import { TeacherAssistantUser } from "../entities/teacher-assistant-user.entity";

const TOKEN_TTL_SECONDS = AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60;
const TOKEN_TYPE = "teacher-assistant";
const REFRESH_TOKEN_TYPE = "refresh";

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
    @InjectRepository(TeacherAssistantUser)
    private readonly userRepo: Repository<TeacherAssistantUser>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    name: string;
    schoolName?: string | null;
  }): Promise<TeacherAssistantAuthResult> {
    const email = normaliseEmail(input.email);
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with that email already exists.");
    }
    const passwordHash = await this.passwordService.hashSimple(input.password);
    const user = this.userRepo.create({
      email,
      passwordHash,
      name: input.name.trim(),
      schoolName: input.schoolName?.trim() || null,
    });
    const saved = await this.userRepo.save(user);
    this.logger.log(`Registered new teacher: ${saved.email} (id=${saved.id})`);
    return this.tokenFor(saved);
  }

  async login(email: string, password: string): Promise<TeacherAssistantAuthResult> {
    const user = await this.userRepo.findOne({ where: { email: normaliseEmail(email) } });
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
    return this.userRepo.findOne({ where: { id } });
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
