import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ModuleLicense } from "../entities/module-license.entity";
import { ModuleLicenseRepository } from "./module-license.repository";

@Injectable()
export class PostgresModuleLicenseRepository
  extends TypeOrmCrudRepository<ModuleLicense>
  implements ModuleLicenseRepository
{
  constructor(@InjectRepository(ModuleLicense) repository: Repository<ModuleLicense>) {
    super(repository);
  }

  findByCompanyAndModule(companyId: number, moduleKey: string): Promise<ModuleLicense | null> {
    return this.repository.findOne({ where: { companyId, moduleKey } });
  }

  findByModule(moduleKey: string): Promise<ModuleLicense[]> {
    return this.repository.find({ where: { moduleKey } });
  }
}
