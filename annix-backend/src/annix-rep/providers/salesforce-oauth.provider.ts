import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CrmType } from "../entities";
import type {
  CrmOAuthConfig,
  CrmOAuthTokenResponse,
  CrmUserInfo,
  ICrmOAuthProvider,
} from "./crm-oauth-provider.interface";

interface SalesforceTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  scope?: string;
}

interface SalesforceUserInfoResponse {
  user_id: string;
  organization_id: string;
  email: string;
  name: string;
  display_name: string;
  nick_name: string;
  urls: Record<string, string>;
}

@Injectable()
export class SalesforceOAuthProvider implements ICrmOAuthProvider {
  private readonly logger = new Logger(SalesforceOAuthProvider.name);
  readonly crmType = CrmType.SALESFORCE;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly isSandbox: boolean;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("SALESFORCE_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("SALESFORCE_CLIENT_SECRET") ?? "";
    this.isSandbox = this.configService.get<string>("SALESFORCE_SANDBOX") === "true";
  }

  private authBaseUrl(): string {
    return this.isSandbox ? "https://test.salesforce.com" : "https://login.salesforce.com";
  }

  oauthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: "api refresh_token offline_access",
      state,
    });

    return `${this.authBaseUrl()}/services/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<CrmOAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
    });

    const response = await fetch(`${this.authBaseUrl()}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Salesforce token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code with Salesforce");
    }

    const data: SalesforceTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: 7200,
      instanceUrl: data.instance_url,
      tokenType: data.token_type,
      scope: data.scope ?? null,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CrmOAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.authBaseUrl()}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Salesforce token refresh failed: ${error}`);
      throw new Error("Failed to refresh Salesforce access token");
    }

    const data: SalesforceTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: 7200,
      instanceUrl: data.instance_url,
      tokenType: data.token_type,
      scope: data.scope ?? null,
    };
  }

  async userInfo(config: CrmOAuthConfig): Promise<CrmUserInfo> {
    if (!config.instanceUrl) {
      throw new Error("Instance URL is required for Salesforce user info");
    }

    const response = await fetch(`${config.instanceUrl}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Salesforce user info failed: ${error}`);
      throw new Error("Failed to fetch Salesforce user info");
    }

    const data: SalesforceUserInfoResponse = await response.json();

    return {
      id: data.user_id,
      email: data.email,
      name: data.name ?? data.display_name,
      organizationId: data.organization_id,
      organizationName: null,
    };
  }

  async revokeToken(accessToken: string): Promise<void> {
    const params = new URLSearchParams({
      token: accessToken,
    });

    const response = await fetch(`${this.authBaseUrl()}/services/oauth2/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.warn(`Salesforce token revocation failed: ${error}`);
    }
  }
}
