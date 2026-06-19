export class InboundEmailConfig {
  id: number;

  app: string;

  companyId: number | null;

  emailHost: string;

  emailPort: number;

  emailUser: string;

  emailPassEncrypted: Buffer;

  tlsEnabled: boolean;

  tlsServerName: string | null;

  enabled: boolean;

  lastPollAt: Date | null;

  lastError: string | null;

  createdAt: Date;

  updatedAt: Date;
}
