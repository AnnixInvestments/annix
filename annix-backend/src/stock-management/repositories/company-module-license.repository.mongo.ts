import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CompanyModuleLicense } from "../entities/company-module-license.entity";
import { CompanyModuleLicenseRepository } from "./company-module-license.repository";

@Injectable()
export class MongoCompanyModuleLicenseRepository
  extends MongoCrudRepository<CompanyModuleLicense>
  implements CompanyModuleLicenseRepository
{
  constructor(@InjectModel("CompanyModuleLicense") model: Model<CompanyModuleLicense>) {
    super(model);
  }

  build(data: DeepPartial<CompanyModuleLicense>): CompanyModuleLicense {
    return data as CompanyModuleLicense;
  }

  async findByCompanyModule(
    companyId: number,
    moduleKey: string,
  ): Promise<CompanyModuleLicense | null> {
    const doc = await this.documents.findOne({ companyId, moduleKey }).lean().exec();
    return this.toDomain(doc);
  }
}
