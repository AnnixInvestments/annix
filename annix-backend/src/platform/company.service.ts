import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RubberCompanyRepository } from "../rubber-lining/repositories/rubber-company.repository";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { CompanyRepository } from "./company.repository";
import { CompanyModuleSubscriptionRepository } from "./company-module-subscription.repository";
import { Company, CompanyType } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";

export interface CompanyPage {
  data: Company[];
  total: number;
  page: number;
  limit: number;
}

export interface CompanySearchFilters {
  companyType?: CompanyType;
  search?: string;
  hasModule?: string;
  page?: number;
  limit?: number;
}

export const MODULE_CODES = {
  STOCK_CONTROL: "stock-control",
  AU_RUBBER: "au-rubber",
  ANNIX_SENTINEL: "annix-sentinel",
  ANNIX_ORBIT: "annix-orbit",
  FIELDFLOW: "fieldflow",
  ANNIX_REP: "annix-rep",
  RFQ: "rfq",
} as const;

export type CoreModuleApp = "stock-control" | "au-rubber";
export type CoreAppAccessState = "enabled" | "disabled" | "unknown";

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly subscriptionRepo: CompanyModuleSubscriptionRepository,
    private readonly stockControlCompanyRepo: StockControlCompanyRepository,
    private readonly rubberCompanyRepo: RubberCompanyRepository,
  ) {}

  async findById(id: number): Promise<Company> {
    const company = await this.companyRepo.findById(id, ["moduleSubscriptions"]);

    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }

    return company;
  }

  search(filters: CompanySearchFilters): Promise<CompanyPage> {
    return this.companyRepo.search(filters);
  }

  async create(data: Partial<Company>): Promise<Company> {
    return this.companyRepo.create(data);
  }

  async update(id: number, data: Partial<Company>): Promise<Company> {
    const company = await this.findById(id);
    Object.assign(company, data);
    return this.companyRepo.save(company);
  }

  async activeModules(companyId: number): Promise<string[]> {
    const subscriptions = await this.subscriptionRepo.findActiveByCompany(companyId);
    return subscriptions.map((sub) => sub.moduleCode);
  }

  async enabledApps(companyId: number): Promise<CoreModuleApp[]> {
    const [stockControlCompany, rubberCompany] = await Promise.all([
      this.stockControlCompanyRepo.findById(companyId),
      this.rubberCompanyRepo.findById(companyId),
    ]);

    return [
      { app: MODULE_CODES.STOCK_CONTROL, enabled: stockControlCompany !== null },
      { app: MODULE_CODES.AU_RUBBER, enabled: rubberCompany !== null },
    ]
      .filter(({ enabled }) => enabled)
      .map(({ app }) => app);
  }

  async coreAppAccessState(companyId: number, app: CoreModuleApp): Promise<CoreAppAccessState> {
    const subscription = await this.subscriptionRepo.findByCompanyAndModule(companyId, app);
    if (!subscription) {
      return "unknown";
    }

    return subscription.disabledAt === null ? "enabled" : "disabled";
  }

  async hasModule(companyId: number, moduleCode: string): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findByCompanyAndModule(companyId, moduleCode);
    return subscription !== null && subscription.disabledAt === null;
  }

  async enableModule(companyId: number, moduleCode: string): Promise<CompanyModuleSubscription> {
    const existing = await this.subscriptionRepo.findByCompanyAndModule(companyId, moduleCode);

    if (existing) {
      existing.disabledAt = null;
      return this.subscriptionRepo.save(existing);
    }

    return this.subscriptionRepo.create({ companyId, moduleCode });
  }

  async disableModule(companyId: number, moduleCode: string): Promise<void> {
    const existing = await this.subscriptionRepo.findByCompanyAndModule(companyId, moduleCode);

    if (existing) {
      existing.disabledAt = new Date();
      await this.subscriptionRepo.save(existing);
    }
  }

  moduleSubscriptions(companyId: number): Promise<CompanyModuleSubscription[]> {
    return this.subscriptionRepo.findAllByCompany(companyId);
  }

  companiesWithModule(moduleCode: string): Promise<Company[]> {
    return this.companyRepo.companiesWithModule(moduleCode);
  }
}
