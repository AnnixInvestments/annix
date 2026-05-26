import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ModuleLicense } from "../entities/module-license.entity";
import { ModuleLicenseRepository } from "./module-license.repository";

@Injectable()
export class MongoModuleLicenseRepository
  extends MongoCrudRepository<ModuleLicense>
  implements ModuleLicenseRepository
{
  constructor(@InjectModel("ModuleLicense") model: Model<ModuleLicense>) {
    super(model);
  }

  async findByCompanyAndModule(
    companyId: number,
    moduleKey: string,
  ): Promise<ModuleLicense | null> {
    const doc = await this.documents.findOne({ companyId, moduleKey }).lean().exec();
    return this.toDomain(doc);
  }

  async findByModule(moduleKey: string): Promise<ModuleLicense[]> {
    const docs = await this.documents.find({ moduleKey }).lean().exec();
    return this.toDomainList(docs);
  }
}
