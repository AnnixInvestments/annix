import { Company } from "../../../platform/entities/company.entity";

export class AnnixSentinelSageConnection {
  id!: number;

  companyId!: number;

  accessTokenEncrypted!: string;

  refreshTokenEncrypted!: string;

  tokenExpiresAt!: Date;

  sageResourceOwnerId!: string | null;

  lastSyncAt!: Date | null;

  connectedAt!: Date;

  company!: Company;
}
