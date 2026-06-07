import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { now } from "../lib/datetime";
import { PasswordService } from "../shared/auth/password.service";
import { UserRepository } from "../user/user.repository";
import { JwtPayload } from "./jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepo.findByEmailWithRoles(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verify(password, user.passwordHash || "");

    if (isPasswordValid) {
      const { passwordHash, ...result } = user;
      return result;
    }

    throw new UnauthorizedException("Invalid credentials");
  }

  async login(user: any) {
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

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const user = await this.userRepo.findByIdWithRoles(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
