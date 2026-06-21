export class SocialCredential {
  id: string;

  platform: string;

  accessTokenEnc: string;

  refreshTokenEnc: string | null;

  expiresAt: Date;

  refreshExpiresAt: Date | null;

  scope: string | null;

  authorUrn: string | null;

  connectedBy: string | null;

  createdAt: Date;

  updatedAt: Date;
}
