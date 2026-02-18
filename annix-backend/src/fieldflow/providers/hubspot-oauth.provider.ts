import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CrmType } from "../entities";
import type {
  CrmOAuthConfig,
  CrmOAuthTokenResponse,
  CrmUserInfo,
  ICrmOAuthProvider,
} from "./crm-oauth-provider.interface";

interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface HubSpotTokenInfoResponse {
  user: string;
  user_id: number;
  hub_domain: string;
  hub_id: number;
  app_id: number;
  scopes: string[];
  token_type: string;
}

interface HubSpotAccountInfoResponse {
  portalId: number;
  accountType: string;
  timeZone: string;
  companyCurrency: string;
  additionalCurrencies: string[];
  utcOffset: string;
  utcOffsetMilliseconds: number;
  uiDomain: string;
  dataHostingLocation: string;
}

@Injectable()
export class HubSpotOAuthProvider implements ICrmOAuthProvider {
  private readonly logger = new Logger(HubSpotOAuthProvider.name);
  readonly crmType = CrmType.HUBSPOT;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authBaseUrl = "https://app.hubspot.com/oauth/authorize";
  private readonly tokenUrl = "https://api.hubapi.com/oauth/v1/token";
  private readonly tokenInfoUrl = "https://api.hubapi.com/oauth/v1/access-tokens";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("HUBSPOT_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("HUBSPOT_CLIENT_SECRET") ?? "";
  }

  oauthUrl(redirectUri: string, state: string): string {
    const scopes = [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
      "crm.objects.companies.read",
      "crm.objects.companies.write",
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state,
    });

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<CrmOAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`HubSpot token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code with HubSpot");
    }

    const data: HubSpotTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      instanceUrl: null,
      tokenType: data.token_type,
      scope: null,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<CrmOAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`HubSpot token refresh failed: ${error}`);
      throw new Error("Failed to refresh HubSpot access token");
    }

    const data: HubSpotTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      instanceUrl: null,
      tokenType: data.token_type,
      scope: null,
    };
  }

  async userInfo(config: CrmOAuthConfig): Promise<CrmUserInfo> {
    const tokenInfoResponse = await fetch(`${this.tokenInfoUrl}/${config.accessToken}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!tokenInfoResponse.ok) {
      const error = await tokenInfoResponse.text();
      this.logger.error(`HubSpot token info failed: ${error}`);
      throw new Error("Failed to fetch HubSpot token info");
    }

    const tokenInfo: HubSpotTokenInfoResponse = await tokenInfoResponse.json();

    const accountInfoResponse = await fetch("https://api.hubapi.com/account-info/v3/details", {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    let accountInfo: HubSpotAccountInfoResponse | null = null;
    if (accountInfoResponse.ok) {
      accountInfo = await accountInfoResponse.json();
    }

    return {
      id: String(tokenInfo.user_id),
      email: tokenInfo.user,
      name: null,
      organizationId: String(tokenInfo.hub_id),
      organizationName: tokenInfo.hub_domain,
    };
  }

  async revokeToken(accessToken: string): Promise<void> {
    const params = new URLSearchParams({
      token: accessToken,
    });

    const response = await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${accessToken}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.warn(`HubSpot token revocation failed: ${error}`);
    }
  }
}
