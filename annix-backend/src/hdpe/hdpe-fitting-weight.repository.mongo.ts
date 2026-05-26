import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpeFittingWeight } from "./entities/hdpe-fitting-weight.entity";
import { HdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository";

@Injectable()
export class MongoHdpeFittingWeightRepository
  extends MongoCrudRepository<HdpeFittingWeight>
  implements HdpeFittingWeightRepository
{
  constructor(@InjectModel("HdpeFittingWeight") model: Model<HdpeFittingWeight>) {
    super(model);
  }

  async findByFittingTypeId(fittingTypeId: number): Promise<HdpeFittingWeight[]> {
    const documents = await this.documents
      .find({ fittingTypeId, isActive: true })
      .sort({ nominalBore: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByFittingTypeIdAndNominalBore(
    fittingTypeId: number,
    nominalBore: number,
  ): Promise<HdpeFittingWeight | null> {
    const document = await this.documents
      .findOne({ fittingTypeId, nominalBore, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }
}
