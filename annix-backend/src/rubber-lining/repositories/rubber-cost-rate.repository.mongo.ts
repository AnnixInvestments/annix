import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CostRateType, RubberCostRate } from "../entities/rubber-cost-rate.entity";
import { RubberCostRateRepository } from "./rubber-cost-rate.repository";

@Injectable()
export class MongoRubberCostRateRepository
  extends MongoCrudRepository<RubberCostRate>
  implements RubberCostRateRepository
{
  constructor(@InjectModel("RubberCostRate") model: Model<RubberCostRate>) {
    super(model);
  }

  build(data: Partial<RubberCostRate>): RubberCostRate {
    return data as RubberCostRate;
  }

  async findAllWithCodingOrdered(rateType?: CostRateType): Promise<RubberCostRate[]> {
    const filter: Record<string, unknown> = {};
    if (rateType) {
      filter.rateType = rateType;
    }
    const docs = await this.documents.find(filter).sort({ rateType: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithCoding(id: number): Promise<RubberCostRate | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByRateType(rateType: CostRateType): Promise<RubberCostRate | null> {
    const doc = await this.documents.findOne({ rateType }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByRateTypeAndCoding(
    rateType: CostRateType,
    compoundCodingId: number,
  ): Promise<RubberCostRate | null> {
    const doc = await this.documents.findOne({ rateType, compoundCodingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByRateType(rateType: CostRateType): Promise<RubberCostRate[]> {
    const docs = await this.documents.find({ rateType }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
