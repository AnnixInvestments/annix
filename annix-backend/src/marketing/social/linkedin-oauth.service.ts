import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { now } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import { SocialCredential } from "./entities/social-credential.entity";
import { SocialCredentialRepository } from "./repositories/social-credential.repository";

const LINKEDIN_PLATFORM = "linkedin";
const LINKEDIN_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_SCOPES = "w_organization_social r_organization_social";

export type LinkedInSourceKind = "oauth" | "env" | "none";

export interface LinkedInStatus {
  connected: boolean;
  expiresAt: string | null;
  authorUrn: string | null;
  source: LinkedInSourceKind;
}

interface LinkedInTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

@Injectable()
export class LinkedInOAuthService {
  private readonly logger = new Logger(LinkedInOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly credentialRepo: SocialCredentialRepository,
  ) {}

  private clientId(): string {
    return this.configService.get<string>("LINKEDIN_CLIENT_ID") ?? "";
  }

  private clientSecret(): string {
    return this.configService.get<string>("LINKEDIN_CLIENT_SECRET") ?? "";
  }

  private redirectUri(): string {
    return this.configService.get<string>("LINKEDIN_REDIRECT_URI") ?? "";
  }

  private envAccessToken(): string {
    return this.configService.get<string>("LINKEDIN_ACCESS_TOKEN") ?? "";
  }

  private envAuthorUrn(): string {
    return this.configService.get<string>("LINKEDIN_AUTHOR_URN") ?? "";
  }

  private encryptionKey(): string {
    return this.configService.get<string>("TOKEN_ENCRYPTION_KEY") ?? "";
  }

  private stateSecret(): string {
    const secret = this.clientSecret() || this.configService.get<string>("JWT_SECRET") || "";
    return secret;
  }

  isClientConfigured(): boolean {
    return this.clientId().length > 0 && this.clientSecret().length > 0;
  }

  hasEnvToken(): boolean {
    return this.envAccessToken().length > 0;
  }

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      scope: LINKEDIN_SCOPES,
      state,
    });
    return `${LINKEDIN_AUTHORIZE_URL}?${params.toString()}`;
  }

  makeState(): string {
    const nonce = randomBytes(16).toString("hex");
    const signature = this.signState(nonce);
    return `${nonce}.${signature}`;
  }

  verifyState(state: string): boolean {
    const parts = state.split(".");
    if (parts.length !== 2) {
      return false;
    }
    const [nonce, signature] = parts;
    if (!nonce || !signature) {
      return false;
    }
    const expected = this.signState(nonce);
    const provided = Buffer.from(signature);
    const computed = Buffer.from(expected);
    if (provided.length !== computed.length) {
      return false;
    }
    return timingSafeEqual(provided, computed);
  }

  private signState(nonce: string): string {
    return createHmac("sha256", this.stateSecret()).update(nonce).digest("hex");
  }

  private encryptToken(token: string): string {
    const key = this.encryptionKey();
    if (!key) {
      this.logger.warn("TOKEN_ENCRYPTION_KEY not set — storing LinkedIn token unencrypted");
      return token;
    }
    return encrypt(token, key).toString("base64");
  }

  private decryptToken(encrypted: string): string {
    const key = this.encryptionKey();
    if (!key) {
      return encrypted;
    }
    return decrypt(Buffer.from(encrypted, "base64"), key);
  }

  private async credential(): Promise<SocialCredential | null> {
    return this.credentialRepo.findById(LINKEDIN_PLATFORM);
  }

  async exchangeCode(code: string, connectedBy: string | null): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri(),
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
    });
    const tokens = await this.requestTokens(body);
    await this.persistTokens(tokens, connectedBy);
  }

  async validAccessToken(): Promise<string | null> {
    const credential = await this.credential();
    if (credential) {
      if (!this.isExpired(credential.expiresAt)) {
        return this.decryptToken(credential.accessTokenEnc);
      }
      const refreshed = await this.tryRefresh(credential);
      if (refreshed) {
        return refreshed;
      }
    }
    const envToken = this.envAccessToken();
    return envToken.length > 0 ? envToken : null;
  }

  private async tryRefresh(credential: SocialCredential): Promise<string | null> {
    if (!credential.refreshTokenEnc) {
      this.logger.warn("LinkedIn access token expired and no refresh token is stored");
      return null;
    }
    if (credential.refreshExpiresAt && this.isExpired(credential.refreshExpiresAt)) {
      this.logger.warn("LinkedIn refresh token has expired — reconnect required");
      return null;
    }
    const refreshToken = this.decryptToken(credential.refreshTokenEnc);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
    });
    try {
      const tokens = await this.requestTokens(body);
      await this.persistTokens(tokens, credential.connectedBy);
      return tokens.access_token ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`LinkedIn token refresh failed: ${message}`);
      return null;
    }
  }

  private async requestTokens(body: URLSearchParams): Promise<LinkedInTokenResponse> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(`LinkedIn token request failed: ${response.status} ${detail}`);
      throw new Error("LinkedIn rejected the token request.");
    }
    const parsed = (await response.json()) as LinkedInTokenResponse;
    if (!parsed.access_token) {
      throw new Error("LinkedIn did not return an access token.");
    }
    return parsed;
  }

  private async persistTokens(
    tokens: LinkedInTokenResponse,
    connectedBy: string | null,
  ): Promise<void> {
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new Error("LinkedIn did not return an access token.");
    }
    const issuedAt = now();
    const expiresAt = issuedAt.plus({ seconds: tokens.expires_in ?? 0 }).toJSDate();
    const refreshExpiresAt = tokens.refresh_token_expires_in
      ? issuedAt.plus({ seconds: tokens.refresh_token_expires_in }).toJSDate()
      : null;
    const credential: SocialCredential = {
      id: LINKEDIN_PLATFORM,
      platform: LINKEDIN_PLATFORM,
      accessTokenEnc: this.encryptToken(accessToken),
      refreshTokenEnc: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
      expiresAt,
      refreshExpiresAt,
      scope: tokens.scope ?? null,
      authorUrn: this.envAuthorUrn() || null,
      connectedBy,
      createdAt: issuedAt.toJSDate(),
      updatedAt: issuedAt.toJSDate(),
    };
    await this.credentialRepo.save(credential);
    this.logger.log(`Stored LinkedIn OAuth credentials (connectedBy=${connectedBy ?? "unknown"})`);
  }

  async status(): Promise<LinkedInStatus> {
    const credential = await this.credential();
    if (credential) {
      return {
        connected: true,
        expiresAt: credential.expiresAt ? credential.expiresAt.toISOString() : null,
        authorUrn: credential.authorUrn ?? (this.envAuthorUrn() || null),
        source: "oauth",
      };
    }
    if (this.hasEnvToken()) {
      return {
        connected: true,
        expiresAt: null,
        authorUrn: this.envAuthorUrn() || null,
        source: "env",
      };
    }
    return { connected: false, expiresAt: null, authorUrn: null, source: "none" };
  }

  async disconnect(): Promise<void> {
    const credential = await this.credential();
    if (credential) {
      await this.credentialRepo.remove(credential);
      this.logger.log("Removed stored LinkedIn OAuth credentials");
    }
  }

  authorUrn(): string {
    return this.envAuthorUrn();
  }

  private isExpired(date: Date): boolean {
    return now().toMillis() >= date.getTime();
  }
}
