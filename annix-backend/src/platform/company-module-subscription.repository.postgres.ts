import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CompanyModuleSubscriptionRepository } from "./company-module-subscription.repository";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";

@Injectable()
export class PostgresCompanyModuleSubscriptionRepository
  extends TypeOrmCrudRepository<CompanyModuleSubscription>
  implements CompanyModuleSubscriptionRepository
{
  constructor(
    @InjectRepository(CompanyModuleSubscription)
    repository: Repository<CompanyModuleSubscription>,
  ) {
    super(repository);
  }

  findByCompanyAndModule(
    companyId: number,
    moduleCode: string,
  ): Promise<CompanyModuleSubscription | null> {
    return this.repository.findOne({ where: { companyId, moduleCode } });
  }

  findActiveByCompany(companyId: number): Promise<CompanyModuleSubscription[]> {
    return this.repository.find({ where: { companyId, disabledAt: IsNull() } });
  }

  findAllByCompany(companyId: number): Promise<CompanyModuleSubscription[]> {
    return this.repository.find({ where: { companyId }, order: { moduleCode: "ASC" } });
  }
}
