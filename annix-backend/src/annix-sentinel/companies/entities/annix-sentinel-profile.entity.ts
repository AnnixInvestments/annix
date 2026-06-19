import { Company } from "../../../platform/entities/company.entity";
import { User } from "../../../user/entities/user.entity";

export class AnnixSentinelProfile {
  id: number;

  user: User;

  userId: number;

  company: Company;

  companyId: number;

  termsAcceptedAt: Date | null;

  termsVersion: string | null;

  createdAt: Date;

  updatedAt: Date;
}
