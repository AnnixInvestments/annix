export class SageConnection {
  id: number;

  appKey: string;

  sageUsername: string | null;

  sagePassEncrypted: Buffer | null;

  accessTokenEncrypted: Buffer | null;

  refreshTokenEncrypted: Buffer | null;

  tokenExpiresAt: Date | null;

  refreshTokenExpiresAt: Date | null;

  sageCompanyId: number | null;

  sageCompanyName: string | null;

  enabled: boolean;

  connectedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
