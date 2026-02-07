import { Injectable } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { AUTH_CONSTANTS } from "./auth.constants";
import { JwtTokenPayload, TokenPair } from "./auth.interfaces";

export interface TokenOptions {
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokenPair(payload: JwtTokenPayload, options?: TokenOptions): Promise<TokenPair> {
    const accessTokenExpiry = options?.accessTokenExpiry || AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY;
    const refreshTokenExpiry = options?.refreshTokenExpiry || AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY;

    const payloadObj: Record<string, any> = { ...payload };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payloadObj, {
        expiresIn: accessTokenExpiry,
      } as JwtSignOptions),
      this.jwtService.signAsync(payloadObj, {
        expiresIn: refreshTokenExpiry,
      } as JwtSignOptions),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyToken<T extends object>(token: string): Promise<T> {
    return this.jwtService.verifyAsync<T>(token);
  }

  generateVerificationToken(payload: Record<string, any>, expiresInHours: number): string {
    return this.jwtService.sign(payload, { expiresIn: `${expiresInHours}h` });
  }
}
