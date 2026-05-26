import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberPricingTier } from "../entities/rubber-pricing-tier.entity";
import { RubberPricingTierRepository } from "./rubber-pricing-tier.repository";

@Injectable()
export class MongoRubberPricingTierRepository
  extends MongoCrudRepository<RubberPricingTier>
  implements RubberPricingTierRepository
{
  constructor(@InjectModel("RubberPricingTier") model: Model<RubberPricingTier>) {
    super(model);
  }

  build(data: Partial<RubberPricingTier>): RubberPricingTier {
    return data as RubberPricingTier;
  }

  async findAllOrderedByPricingFactor(): Promise<RubberPricingTier[]> {
    const docs = await this.documents.find().sort({ pricingFactor: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
