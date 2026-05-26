import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CompanyModuleLicense } from "../entities/company-module-license.entity";
import { CompanyModuleLicenseRepository } from "./company-module-license.repository";

@Injectable()
export class PostgresCompanyModuleLicenseRepository
  extends TypeOrmCrudRepository<CompanyModuleLicense>
  implements CompanyModuleLicenseRepository
{
  constructor(
    @InjectRepository(CompanyModuleLicense) repository: Repository<CompanyModuleLicense>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<CompanyModuleLicense>): CompanyModuleLicense {
    return this.repository.create(data as TypeOrmDeepPartial<CompanyModuleLicense>);
  }

  findByCompanyModule(companyId: number, moduleKey: string): Promise<CompanyModuleLicense | null> {
    return this.repository.findOne({ where: { companyId, moduleKey } });
  }
}
