import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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
  COMPLY_SA: "comply-sa",
  CV_ASSISTANT: "cv-assistant",
  FIELDFLOW: "fieldflow",
  ANNIX_REP: "annix-rep",
  RFQ: "rfq",
} as const;

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyModuleSubscription)
    private readonly subscriptionRepo: Repository<CompanyModuleSubscription>,
  ) {}

  async findById(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ["moduleSubscriptions"],
    });

    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }

    return company;
  }

  async search(filters: CompanySearchFilters): Promise<CompanyPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.companyRepo
      .createQueryBuilder("company")
      .leftJoinAndSelect("company.moduleSubscriptions", "sub", "sub.disabled_at IS NULL");

    if (filters.companyType) {
      qb.andWhere("company.company_type = :companyType", { companyType: filters.companyType });
    }

    if (filters.search) {
      qb.andWhere(
        "(company.name ILIKE :search OR company.trading_name ILIKE :search OR company.legal_name ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    if (filters.hasModule) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = company.id
            AND cms.module_code = :moduleCode
            AND cms.disabled_at IS NULL
        )`,
        { moduleCode: filters.hasModule },
      );
    }

    qb.orderBy("company.name", "ASC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async create(data: Partial<Company>): Promise<Company> {
    return this.companyRepo.save(this.companyRepo.create(data));
  }

  async update(id: number, data: Partial<Company>): Promise<Company> {
    const company = await this.findById(id);
    Object.assign(company, data);
    return this.companyRepo.save(company);
  }

  async findByLegacyScCompanyId(scCompanyId: number): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { legacyScCompanyId: scCompanyId },
      relations: ["moduleSubscriptions"],
    });
  }

  async findByLegacyRubberCompanyId(rubberCompanyId: number): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { legacyRubberCompanyId: rubberCompanyId },
      relations: ["moduleSubscriptions"],
    });
  }

  async activeModules(companyId: number): Promise<string[]> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { companyId, disabledAt: IsNull() },
    });

    return subscriptions.map((sub) => sub.moduleCode);
  }

  async hasModule(companyId: number, moduleCode: string): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { companyId, moduleCode, disabledAt: IsNull() },
    });

    return subscription !== null;
  }

  async enableModule(companyId: number, moduleCode: string): Promise<CompanyModuleSubscription> {
    const existing = await this.subscriptionRepo.findOne({
      where: { companyId, moduleCode },
    });

    if (existing) {
      existing.disabledAt = null;
      return this.subscriptionRepo.save(existing);
    }

    return this.subscriptionRepo.save(this.subscriptionRepo.create({ companyId, moduleCode }));
  }

  async disableModule(companyId: number, moduleCode: string): Promise<void> {
    const existing = await this.subscriptionRepo.findOne({
      where: { companyId, moduleCode },
    });

    if (existing) {
      existing.disabledAt = new Date();
      await this.subscriptionRepo.save(existing);
    }
  }

  async moduleSubscriptions(companyId: number): Promise<CompanyModuleSubscription[]> {
    return this.subscriptionRepo.find({
      where: { companyId },
      order: { moduleCode: "ASC" },
    });
  }

  async companiesWithModule(moduleCode: string): Promise<Company[]> {
    return this.companyRepo
      .createQueryBuilder("company")
      .innerJoin(
        "company_module_subscriptions",
        "sub",
        "sub.company_id = company.id AND sub.module_code = :moduleCode AND sub.disabled_at IS NULL",
        { moduleCode },
      )
      .orderBy("company.name", "ASC")
      .getMany();
  }
}
