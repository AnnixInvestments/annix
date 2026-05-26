import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcFittingWeightRepository } from "./pvc-fitting-weight.repository";

@Injectable()
export class MongoPvcFittingWeightRepository
  extends MongoCrudRepository<PvcFittingWeight>
  implements PvcFittingWeightRepository
{
  constructor(@InjectModel("PvcFittingWeight") model: Model<PvcFittingWeight>) {
    super(model);
  }

  async findByFittingTypeId(fittingTypeId: number): Promise<PvcFittingWeight[]> {
    const documents = await this.documents
      .find({ fittingTypeId, isActive: true })
      .sort({ nominalDiameter: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByFittingTypeIdAndDN(
    fittingTypeId: number,
    nominalDiameter: number,
    pressureRating?: number,
  ): Promise<PvcFittingWeight | null> {
    const query: Record<string, unknown> = { fittingTypeId, nominalDiameter, isActive: true };
    if (pressureRating !== undefined) {
      query.pressureRating = pressureRating;
    }
    const document = await this.documents.findOne(query).lean().exec();
    return this.toDomain(document);
  }
}
