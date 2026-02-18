import type { CrmType } from "../entities";

export interface CrmOAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  instanceUrl: string | null;
  tokenType: string;
  scope: string | null;
}

export interface CrmOAuthConfig {
  accessToken: string;
  refreshToken: string | null;
  instanceUrl: string | null;
}

export interface CrmUserInfo {
  id: string;
  email: string | null;
  name: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export interface ICrmOAuthProvider {
  readonly crmType: CrmType;

  oauthUrl(redirectUri: string, state: string): string;

  exchangeCode(code: string, redirectUri: string): Promise<CrmOAuthTokenResponse>;

  refreshAccessToken(refreshToken: string): Promise<CrmOAuthTokenResponse>;

  userInfo(config: CrmOAuthConfig): Promise<CrmUserInfo>;

  revokeToken(accessToken: string): Promise<void>;
}
