import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ModuleCatalogOverride } from "../entities/module-catalog-override.entity";
import { ModuleCatalogOverrideRepository } from "./module-catalog-override.repository";

@Injectable()
export class MongoModuleCatalogOverrideRepository
  extends MongoCrudRepository<ModuleCatalogOverride>
  implements ModuleCatalogOverrideRepository
{
  constructor(@InjectModel("ModuleCatalogOverride") model: Model<ModuleCatalogOverride>) {
    super(model);
  }

  async findByModuleKey(moduleKey: string): Promise<ModuleCatalogOverride | null> {
    const doc = await this.documents.findOne({ moduleKey }).lean().exec();
    return this.toDomain(doc);
  }
}
