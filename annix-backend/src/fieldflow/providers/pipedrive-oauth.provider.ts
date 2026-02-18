import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CrmType } from "../entities";
import type {
  CrmOAuthConfig,
  CrmOAuthTokenResponse,
  CrmUserInfo,
  ICrmOAuthProvider,
} from "./crm-oauth-provider.interface";

interface PipedriveTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  api_domain: string;
}

interface PipedriveUserResponse {
  success: boolean;
  data: {
    id: number;
    name: string;
    email: string;
    company_id: number;
    company_name: string;
    company_domain: string;
  };
}

@Injectable()
export class PipedriveOAuthProvider implements ICrmOAuthProvider {
  private readonly logger = new Logger(PipedriveOAuthProvider.name);
  readonly crmType = CrmType.PIPEDRIVE;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authBaseUrl = "https://oauth.pipedrive.com/oauth/authorize";
  private readonly tokenUrl = "https://oauth.pipedrive.com/oauth/token";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("PIPEDRIVE_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("PIPEDRIVE_CLIENT_SECRET") ?? "";
  }

  oauthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    });

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<CrmOAuthTokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Pipedrive token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code with Pipedrive");
    }

    const data: PipedriveTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      instanceUrl: data.api_domain,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CrmOAuthTokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Pipedrive token refresh failed: ${error}`);
      throw new Error("Failed to refresh Pipedrive access token");
    }

    const data: PipedriveTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      instanceUrl: data.api_domain,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: CrmOAuthConfig): Promise<CrmUserInfo> {
    const apiDomain = config.instanceUrl ?? "https://api.pipedrive.com";

    const response = await fetch(`${apiDomain}/v1/users/me`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Pipedrive user info failed: ${error}`);
      throw new Error("Failed to fetch Pipedrive user info");
    }

    const data: PipedriveUserResponse = await response.json();

    if (!data.success) {
      throw new Error("Failed to fetch Pipedrive user info");
    }

    return {
      id: String(data.data.id),
      email: data.data.email,
      name: data.data.name,
      organizationId: String(data.data.company_id),
      organizationName: data.data.company_name,
    };
  }

  async revokeToken(accessToken: string): Promise<void> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      token: accessToken,
    });

    const response = await fetch("https://oauth.pipedrive.com/oauth/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.warn(`Pipedrive token revocation failed: ${error}`);
    }
  }
}
