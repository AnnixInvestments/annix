import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { Affiliate } from "../entities/affiliate.entity";
import { AffiliateRepository } from "./affiliate.repository";

@Injectable()
export class MongoAffiliateRepository
  extends MongoCrudRepository<Affiliate>
  implements AffiliateRepository
{
  constructor(
    @InjectModel("Affiliate")
    model: Model<Affiliate>,
  ) {
    super(model);
  }

  build(data: Partial<Affiliate>): Affiliate {
    return data as Affiliate;
  }

  async findByCompanyId(companyId: number): Promise<Affiliate[]> {
    const docs = await this.documents.find({ companyId }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
