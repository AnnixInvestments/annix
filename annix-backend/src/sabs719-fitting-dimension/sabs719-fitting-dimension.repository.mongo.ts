import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Sabs719FittingDimension } from "./entities/sabs719-fitting-dimension.entity";
import { Sabs719FittingDimensionRepository } from "./sabs719-fitting-dimension.repository";

@Injectable()
export class MongoSabs719FittingDimensionRepository
  extends MongoCrudRepository<Sabs719FittingDimension>
  implements Sabs719FittingDimensionRepository
{
  constructor(@InjectModel("Sabs719FittingDimension") model: Model<Sabs719FittingDimension>) {
    super(model);
  }

  async findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs719FittingDimension | null> {
    const filter: Record<string, unknown> = { fittingType, nominalDiameterMm };
    if (angleRange) {
      filter.angleRange = angleRange;
    }
    const document = await this.documents.findOne(filter).lean().exec();
    return this.toDomain(document);
  }

  async distinctFittingTypes(): Promise<string[]> {
    const types = await this.documents.distinct("fittingType").exec();
    return types as string[];
  }

  async distinctSizes(fittingType: string): Promise<number[]> {
    const sizes = await this.documents.distinct("nominalDiameterMm", { fittingType }).exec();
    return (sizes as number[]).map((s) => parseFloat(String(s))).sort((a, b) => a - b);
  }
}
