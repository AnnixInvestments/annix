import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ModuleCatalogOverride } from "../entities/module-catalog-override.entity";
import { ModuleCatalogOverrideRepository } from "./module-catalog-override.repository";

@Injectable()
export class PostgresModuleCatalogOverrideRepository
  extends TypeOrmCrudRepository<ModuleCatalogOverride>
  implements ModuleCatalogOverrideRepository
{
  constructor(
    @InjectRepository(ModuleCatalogOverride) repository: Repository<ModuleCatalogOverride>,
  ) {
    super(repository);
  }

  findByModuleKey(moduleKey: string): Promise<ModuleCatalogOverride | null> {
    return this.repository.findOne({ where: { moduleKey } });
  }
}
