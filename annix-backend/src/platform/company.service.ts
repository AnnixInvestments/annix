import { Injectable, Logger, NotFoundException } from "@nestjs/common";
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

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly subscriptionRepo: CompanyModuleSubscriptionRepository,
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
