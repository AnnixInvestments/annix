import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Sabs62FittingDimension } from "./entities/sabs62-fitting-dimension.entity";
import { Sabs62FittingDimensionRepository } from "./sabs62-fitting-dimension.repository";

@Injectable()
export class MongoSabs62FittingDimensionRepository
  extends MongoCrudRepository<Sabs62FittingDimension>
  implements Sabs62FittingDimensionRepository
{
  constructor(@InjectModel("Sabs62FittingDimension") model: Model<Sabs62FittingDimension>) {
    super(model);
  }

  async findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs62FittingDimension | null> {
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

  async distinctAngleRanges(fittingType: string, nominalDiameterMm: number): Promise<string[]> {
    const angleRanges = await this.documents
      .distinct("angleRange", {
        fittingType,
        nominalDiameterMm,
        angleRange: { $ne: null },
      })
      .exec();
    return (angleRanges as string[]).filter(Boolean);
  }
}
