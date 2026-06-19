import { Company } from "../../../platform/entities/company.entity";

export class AnnixSentinelApiKey {
  id!: number;

  companyId!: number;

  keyHash!: string;

  name!: string;

  lastUsedAt!: Date | null;

  expiresAt!: Date | null;

  active!: boolean;

  createdAt!: Date;

  company!: Company;
}
