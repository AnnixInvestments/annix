import { Company } from "../../../platform/entities/company.entity";
import { User } from "../../../user/entities/user.entity";

export class AnnixSentinelAdvisorClient {
  id!: number;

  advisorUserId!: number;

  clientCompanyId!: number;

  addedAt!: Date;

  advisorUser!: User;

  clientCompany!: Company;
}
