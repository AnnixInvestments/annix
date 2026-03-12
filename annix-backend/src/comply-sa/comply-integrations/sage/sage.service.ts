import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromJSDate, now } from "../../lib/datetime";
import { ComplySaSageConnection } from "./sage-connection.entity";

export interface SageCompanyInfo {
  tradingName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
}

export interface SageFinancialData {
  annualTurnover: number | null;
  payrollTotal: number | null;
  financialYearEnd: string | null;
}

export interface SageContactSummary {
  totalContacts: number;
  employeeEstimate: number;
}

interface SageTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  resource_owner_id?: string;
}

const SAGE_AUTH_URL = "https://www.sageone.com/oauth2/auth/central";
const SAGE_TOKEN_URL = "https://oauth.accounting.sage.com/token";
const SAGE_API_BASE = "https://api.accounting.sage.com/v3.1";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class SageService {
  private readonly logger = new Logger(SageService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(ComplySaSageConnection)
    private readonly connectionRepository: Repository<ComplySaSageConnection>,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.getOrThrow<string>("SAGE_CLIENT_ID");
    this.clientSecret = this.configService.getOrThrow<string>("SAGE_CLIENT_SECRET");
    this.redirectUri = this.configService.getOrThrow<string>("SAGE_REDIRECT_URI");
    const encryptionKeyHex = this.configService.getOrThrow<string>("SAGE_ENCRYPTION_KEY");
    this.encryptionKey = Buffer.from(encryptionKeyHex, "hex");
  }

  authorizationUrl(companyId: number): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "full_access",
      state: String(companyId),
    });

    return `${SAGE_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(companyId: number, code: string): Promise<{ connected: boolean }> {
    const tokenData = await this.exchangeCodeForTokens(code);

    const encryptedAccess = this.encrypt(tokenData.access_token);
    const encryptedRefresh = this.encrypt(tokenData.refresh_token);
    const expiresAt = now().plus({ seconds: tokenData.expires_in }).toJSDate();

    const existing = await this.connectionRepository.findOne({ where: { companyId } });

    if (existing !== null) {
      existing.accessTokenEncrypted = encryptedAccess;
      existing.refreshTokenEncrypted = encryptedRefresh;
      existing.tokenExpiresAt = expiresAt;
      existing.sageResourceOwnerId = tokenData.resource_owner_id ?? null;
      await this.connectionRepository.save(existing);
    } else {
      const connection = this.connectionRepository.create({
        companyId,
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        sageResourceOwnerId: tokenData.resource_owner_id ?? null,
      });
      await this.connectionRepository.save(connection);
    }

    return { connected: true };
  }

  async disconnect(companyId: number): Promise<{ disconnected: boolean }> {
    const result = await this.connectionRepository.delete({ companyId });
    return { disconnected: (result.affected ?? 0) > 0 };
  }

  async isConnected(companyId: number): Promise<{ connected: boolean; lastSync: string | null }> {
    const connection = await this.connectionRepository.findOne({ where: { companyId } });

    if (connection === null) {
      return { connected: false, lastSync: null };
    }

    return {
      connected: true,
      lastSync: connection.lastSyncAt !== null ? fromJSDate(connection.lastSyncAt).toISO() : null,
    };
  }

  async syncCompanyInfo(companyId: number): Promise<SageCompanyInfo> {
    const accessToken = await this.validAccessToken(companyId);
    const response = await this.sageApiRequest<{
      name: string;
      company_registration_number: string | null;
      tax_number: string | null;
    }>(accessToken, "/business");

    return {
      tradingName: response.name ?? null,
      registrationNumber: response.company_registration_number ?? null,
      vatNumber: response.tax_number ?? null,
    };
  }

  async syncFinancialData(companyId: number): Promise<SageFinancialData> {
    const accessToken = await this.validAccessToken(companyId);

    const [salesInvoices, payrollEntries] = await Promise.all([
      this.sageApiRequest<{ $total: number }>(
        accessToken,
        "/sales_invoices?attributes=total_amount&items_per_page=1",
      ),
      this.sageApiRequest<{ $total: number }>(
        accessToken,
        "/payroll_entries?attributes=total_cost&items_per_page=1",
      ).catch(() => null),
    ]);

    const turnoverResponse = await this.sageApiRequest<{
      $items: Array<{ total_amount: string }>;
    }>(accessToken, "/sales_invoices?attributes=total_amount&items_per_page=200");

    const annualTurnover = turnoverResponse.$items.reduce(
      (sum, invoice) => sum + Number.parseFloat(invoice.total_amount || "0"),
      0,
    );

    return {
      annualTurnover,
      payrollTotal: payrollEntries !== null ? payrollEntries.$total : null,
      financialYearEnd: null,
    };
  }

  async syncContacts(companyId: number): Promise<SageContactSummary> {
    const accessToken = await this.validAccessToken(companyId);
    const response = await this.sageApiRequest<{
      $total: number;
      $items: Array<{ contact_type_ids: string[] }>;
    }>(accessToken, "/contacts?items_per_page=200");

    const employeeContacts = response.$items.filter((contact) =>
      contact.contact_type_ids.includes("EMPLOYEE"),
    );

    return {
      totalContacts: response.$total,
      employeeEstimate: employeeContacts.length,
    };
  }

  async fullSync(
    companyId: number,
  ): Promise<{
    companyInfo: SageCompanyInfo;
    financialData: SageFinancialData;
    contacts: SageContactSummary;
  }> {
    this.logger.log(`Starting full Sage sync for company ${companyId}`);

    const [companyInfo, financialData, contacts] = await Promise.all([
      this.syncCompanyInfo(companyId),
      this.syncFinancialData(companyId),
      this.syncContacts(companyId),
    ]);

    const connection = await this.connectionRepository.findOne({ where: { companyId } });
    if (connection !== null) {
      connection.lastSyncAt = now().toJSDate();
      await this.connectionRepository.save(connection);
    }

    this.logger.log(`Completed full Sage sync for company ${companyId}`);

    return { companyInfo, financialData, contacts };
  }

  private async validAccessToken(companyId: number): Promise<string> {
    const connection = await this.connectionRepository.findOne({ where: { companyId } });

    if (connection === null) {
      throw new Error(`No Sage connection found for company ${companyId}`);
    }

    const tokenExpiry = fromJSDate(connection.tokenExpiresAt);
    const fiveMinutesFromNow = now().plus({ minutes: 5 });

    if (tokenExpiry < fiveMinutesFromNow) {
      return this.refreshAccessToken(connection);
    }

    return this.decrypt(connection.accessTokenEncrypted);
  }

  private async refreshAccessToken(connection: ComplySaSageConnection): Promise<string> {
    this.logger.log(`Refreshing Sage token for company ${connection.companyId}`);

    const refreshToken = this.decrypt(connection.refreshTokenEncrypted);

    const response = await fetch(SAGE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Sage token refresh failed: ${response.status} ${errorBody}`);
      throw new Error(`Failed to refresh Sage token: ${response.status}`);
    }

    const tokenData: SageTokenResponse = await response.json();

    connection.accessTokenEncrypted = this.encrypt(tokenData.access_token);
    connection.refreshTokenEncrypted = this.encrypt(tokenData.refresh_token);
    connection.tokenExpiresAt = now().plus({ seconds: tokenData.expires_in }).toJSDate();
    await this.connectionRepository.save(connection);

    return tokenData.access_token;
  }

  private async exchangeCodeForTokens(code: string): Promise<SageTokenResponse> {
    const response = await fetch(SAGE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Sage token exchange failed: ${response.status} ${errorBody}`);
      throw new Error(`Failed to exchange Sage authorization code: ${response.status}`);
    }

    return response.json();
  }

  private async sageApiRequest<T>(accessToken: string, endpoint: string): Promise<T> {
    const url = `${SAGE_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Sage API request failed: ${response.status} ${url} ${errorBody}`);
      throw new Error(`Sage API request failed: ${response.status} ${endpoint}`);
    }

    return response.json();
  }

  private encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  private decrypt(encryptedBase64: string): string {
    const data = Buffer.from(encryptedBase64, "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString("utf8");
  }
}
