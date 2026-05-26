import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CompanyModuleSubscriptionRepository } from "./company-module-subscription.repository";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";

@Injectable()
export class MongoCompanyModuleSubscriptionRepository
  extends MongoCrudRepository<CompanyModuleSubscription>
  implements CompanyModuleSubscriptionRepository
{
  constructor(@InjectModel("CompanyModuleSubscription") model: Model<CompanyModuleSubscription>) {
    super(model);
  }

  async findByCompanyAndModule(
    companyId: number,
    moduleCode: string,
  ): Promise<CompanyModuleSubscription | null> {
    const document = await this.documents.findOne({ companyId, moduleCode }).lean().exec();
    return this.toDomain(document);
  }

  async findActiveByCompany(companyId: number): Promise<CompanyModuleSubscription[]> {
    const documents = await this.documents.find({ companyId, disabledAt: null }).lean().exec();
    return this.toDomainList(documents);
  }

  async findAllByCompany(companyId: number): Promise<CompanyModuleSubscription[]> {
    const documents = await this.documents
      .find({ companyId })
      .sort({ moduleCode: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
