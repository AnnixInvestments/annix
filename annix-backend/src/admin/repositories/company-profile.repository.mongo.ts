import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CompanyProfile } from "../entities/company-profile.entity";
import { CompanyProfileRepository } from "./company-profile.repository";

@Injectable()
export class MongoCompanyProfileRepository
  extends MongoCrudRepository<CompanyProfile>
  implements CompanyProfileRepository
{
  constructor(@InjectModel("CompanyProfile") model: Model<CompanyProfile>) {
    super(model);
  }

  async findSingleton(): Promise<CompanyProfile | null> {
    const doc = await this.documents.findById(1).lean().exec();
    return this.toDomain(doc);
  }
}
