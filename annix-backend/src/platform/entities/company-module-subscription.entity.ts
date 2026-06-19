import { Company } from "./company.entity";

export class CompanyModuleSubscription {
  id: number;

  companyId: number;

  company: Company;

  moduleCode: string;

  enabledAt: Date;

  disabledAt: Date | null;
}
