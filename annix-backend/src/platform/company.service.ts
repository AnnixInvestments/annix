import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";

@Injectable()
export class CompanyService {
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
      where: { companyId, disabledAt: undefined },
    });

    return subscriptions.map((sub) => sub.moduleCode);
  }

  async hasModule(companyId: number, moduleCode: string): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { companyId, moduleCode, disabledAt: undefined },
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
}
