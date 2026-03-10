import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../lib/datetime";
import { decrypt, encrypt } from "../secure-documents/crypto.util";
import { SageConnection } from "./entities/sage-connection.entity";
import {
  SageApiService,
  type SageCompany,
  type SageCustomer,
  type SageSupplier,
  type SageTaxType,
} from "./sage-api.service";

export interface SageConnectionStatus {
  connected: boolean;
  enabled: boolean;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
  connectedAt: Date | null;
  tokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 31 * 24 * 60 * 60 * 1000;

@Injectable()
export class SageConnectionService {
  private readonly logger = new Logger(SageConnectionService.name);
  private refreshingTokens = new Map<string, Promise<string>>();

  constructor(
    @InjectRepository(SageConnection)
    private readonly connectionRepo: Repository<SageConnection>,
    private readonly configService: ConfigService,
    private readonly sageApiService: SageApiService,
  ) {}

  async connectionStatus(appKey: string): Promise<SageConnectionStatus> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });

    if (!conn) {
      return {
        connected: false,
        enabled: false,
        sageCompanyId: null,
        sageCompanyName: null,
        connectedAt: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      };
    }

    return {
      connected:
        conn.accessTokenEncrypted !== null &&
        conn.refreshTokenEncrypted !== null &&
        conn.sageCompanyId !== null,
      enabled: conn.enabled,
      sageCompanyId: conn.sageCompanyId,
      sageCompanyName: conn.sageCompanyName,
      connectedAt: conn.connectedAt,
      tokenExpiresAt: conn.tokenExpiresAt,
      refreshTokenExpiresAt: conn.refreshTokenExpiresAt,
    };
  }

  async addonEnabled(appKey: string): Promise<boolean> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    return conn?.enabled ?? false;
  }

  authorizationUrl(appKey: string): string {
    const redirectUri = this.callbackUrl();
    return this.sageApiService.authorizationUrl(redirectUri, appKey);
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ appKey: string; companies: SageCompany[] }> {
    const appKey = state;
    const redirectUri = this.callbackUrl();
    const tokenResponse = await this.sageApiService.exchangeCode(code, redirectUri);

    const encryptionKey = this.encryptionKey();
    const accessTokenBuf = encrypt(tokenResponse.access_token, encryptionKey);
    const refreshTokenBuf = encrypt(tokenResponse.refresh_token, encryptionKey);

    const tokenExpiresAt = now().plus({ seconds: tokenResponse.expires_in }).toJSDate();
    const refreshTokenExpiresAt = now()
      .plus({ milliseconds: REFRESH_TOKEN_LIFETIME_MS })
      .toJSDate();

    let conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn) {
      conn = this.connectionRepo.create({ appKey, enabled: false });
    }

    conn.accessTokenEncrypted = accessTokenBuf;
    conn.refreshTokenEncrypted = refreshTokenBuf;
    conn.tokenExpiresAt = tokenExpiresAt;
    conn.refreshTokenExpiresAt = refreshTokenExpiresAt;
    conn.sagePassEncrypted = null;
    conn.sageUsername = null;

    await this.connectionRepo.save(conn);

    const companies = await this.sageApiService.companies(tokenResponse.access_token);

    return { appKey, companies };
  }

  async selectCompany(
    appKey: string,
    companyId: number,
    companyName: string,
  ): Promise<{ message: string }> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn || !conn.accessTokenEncrypted) {
      throw new BadRequestException("Sage not authenticated. Please connect to Sage first.");
    }

    conn.sageCompanyId = companyId;
    conn.sageCompanyName = companyName;
    conn.connectedAt = now().toJSDate();
    conn.enabled = true;

    await this.connectionRepo.save(conn);
    return { message: "Sage company selected successfully" };
  }

  async disconnect(appKey: string): Promise<{ message: string }> {
    await this.connectionRepo.update(
      { appKey },
      {
        sageUsername: null,
        sagePassEncrypted: null,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        sageCompanyId: null,
        sageCompanyName: null,
        connectedAt: null,
        enabled: false,
      },
    );
    return { message: "Sage connection removed" };
  }

  async validAccessToken(appKey: string): Promise<string> {
    const existing = this.refreshingTokens.get(appKey);
    if (existing) {
      return existing;
    }

    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.accessTokenEncrypted || !conn?.refreshTokenEncrypted) {
      throw new BadRequestException("Sage not connected. Configure it in Settings first.");
    }

    const encryptionKey = this.encryptionKey();
    const tokenExpiry = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
    const isExpired = Date.now() >= tokenExpiry - TOKEN_EXPIRY_BUFFER_MS;

    if (!isExpired) {
      return decrypt(conn.accessTokenEncrypted, encryptionKey);
    }

    const refreshPromise = this.performTokenRefresh(conn, encryptionKey);
    this.refreshingTokens.set(appKey, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.refreshingTokens.delete(appKey);
    }
  }

  async sageCompanies(appKey: string): Promise<SageCompany[]> {
    const token = await this.validAccessToken(appKey);
    return this.sageApiService.companies(token);
  }

  async sageSuppliers(appKey: string): Promise<SageSupplier[]> {
    const token = await this.validAccessToken(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new BadRequestException("No Sage company selected");
    }
    return this.sageApiService.suppliers(token, conn.sageCompanyId);
  }

  async sageCustomers(appKey: string): Promise<SageCustomer[]> {
    const token = await this.validAccessToken(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new BadRequestException("No Sage company selected");
    }
    return this.sageApiService.customers(token, conn.sageCompanyId);
  }

  async sageTaxTypes(appKey: string): Promise<SageTaxType[]> {
    const token = await this.validAccessToken(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new BadRequestException("No Sage company selected");
    }
    return this.sageApiService.taxTypes(token, conn.sageCompanyId);
  }

  private async performTokenRefresh(conn: SageConnection, encryptionKey: string): Promise<string> {
    const currentRefreshToken = decrypt(conn.refreshTokenEncrypted!, encryptionKey);

    this.logger.log(`Refreshing Sage access token for ${conn.appKey}`);
    const tokenResponse = await this.sageApiService.refreshToken(currentRefreshToken);

    conn.accessTokenEncrypted = encrypt(tokenResponse.access_token, encryptionKey);
    conn.refreshTokenEncrypted = encrypt(tokenResponse.refresh_token, encryptionKey);
    conn.tokenExpiresAt = now().plus({ seconds: tokenResponse.expires_in }).toJSDate();
    conn.refreshTokenExpiresAt = now().plus({ milliseconds: REFRESH_TOKEN_LIFETIME_MS }).toJSDate();

    await this.connectionRepo.save(conn);

    return tokenResponse.access_token;
  }

  private callbackUrl(): string {
    const apiUrl = this.configService.get<string>("API_URL") ?? "http://localhost:4001/api";
    return `${apiUrl}/sage/callback`;
  }

  private encryptionKey(): string {
    const key = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!key) {
      throw new BadRequestException("DOCUMENT_ENCRYPTION_KEY not configured");
    }
    return key;
  }
}
