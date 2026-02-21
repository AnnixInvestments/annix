import { Injectable, Logger } from "@nestjs/common";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string | null;
  email: string;
  oauthId: string;
  firstName: string;
  lastName: string;
}

export type OAuthProvider = "google" | "microsoft" | "zoom";

@Injectable()
export class OAuthLoginProvider {
  private readonly logger = new Logger(OAuthLoginProvider.name);

  private readonly configs: Record<OAuthProvider, OAuthConfig> = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      scopes: ["email", "profile"],
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      userInfoUrl: "https://graph.microsoft.com/v1.0/me",
      scopes: ["openid", "email", "profile", "User.Read", "offline_access"],
    },
    zoom: {
      clientId: process.env.ZOOM_CLIENT_ID ?? "",
      clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
      authUrl: "https://zoom.us/oauth/authorize",
      tokenUrl: "https://zoom.us/oauth/token",
      userInfoUrl: "https://api.zoom.us/v2/users/me",
      scopes: ["user:read"],
    },
  };

  isProviderConfigured(provider: OAuthProvider): boolean {
    const config = this.configs[provider];
    return !!config.clientId && !!config.clientSecret;
  }

  authorizationUrl(provider: OAuthProvider, redirectUri: string, state: string): string | null {
    const config = this.configs[provider];
    if (!config.clientId) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state: state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  async exchangeCode(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResult | null> {
    const config = this.configs[provider];
    if (!config.clientId || !config.clientSecret) {
      this.logger.error(`OAuth provider ${provider} not configured`);
      return null;
    }

    const tokenBody = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      this.logger.error(`OAuth token exchange failed: ${await tokenRes.text()}`);
      return null;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
    };
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;

    const userRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      this.logger.error(`OAuth user info fetch failed: ${await userRes.text()}`);
      return null;
    }

    const userData = (await userRes.json()) as Record<string, unknown>;

    return this.extractUserInfo(provider, userData, accessToken, refreshToken);
  }

  private extractUserInfo(
    provider: OAuthProvider,
    userData: Record<string, unknown>,
    accessToken: string,
    refreshToken: string | null,
  ): OAuthTokenResult {
    let email: string;
    let oauthId: string;
    let firstName = "";
    let lastName = "";

    if (provider === "google") {
      email = userData.email as string;
      oauthId = userData.id as string;
      firstName = (userData.given_name as string) || "";
      lastName = (userData.family_name as string) || "";
    } else if (provider === "microsoft") {
      email = ((userData.mail ?? userData.userPrincipalName) as string) || "";
      oauthId = userData.id as string;
      firstName = (userData.givenName as string) || "";
      lastName = (userData.surname as string) || "";
    } else {
      email = userData.email as string;
      oauthId = userData.id as string;
      firstName = (userData.first_name as string) || "";
      lastName = (userData.last_name as string) || "";
    }

    return { accessToken, refreshToken, email, oauthId, firstName, lastName };
  }
}
