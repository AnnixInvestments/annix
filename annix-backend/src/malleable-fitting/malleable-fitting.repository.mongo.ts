import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";
import { MalleableFittingRepository } from "./malleable-fitting.repository";

@Injectable()
export class MongoMalleableFittingRepository
  extends MongoCrudRepository<MalleableIronFittingDimension>
  implements MalleableFittingRepository
{
  constructor(
    @InjectModel("MalleableIronFittingDimension")
    model: Model<MalleableIronFittingDimension>,
  ) {
    super(model);
  }

  async distinctFittingTypes(): Promise<{ fittingType: string }[]> {
    const values = await this.documents.distinct("fittingType").exec();
    const sorted = (values as string[]).sort();
    return sorted.map((fittingType) => ({ fittingType }));
  }

  async dimensionsByType(
    fittingType: string,
    pressureClass?: number,
  ): Promise<MalleableIronFittingDimension[]> {
    const filter: Record<string, unknown> = { fittingType };
    if (pressureClass !== null && pressureClass !== undefined) {
      filter["pressureClass"] = pressureClass;
    }
    const docs = await this.documents.find(filter).sort({ nominalBoreMm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async sizesByTypeAndClass(
    fittingType: string,
    pressureClass: number,
  ): Promise<{ nominalBoreMm: number }[]> {
    const values = await this.documents
      .distinct("nominalBoreMm", { fittingType, pressureClass })
      .exec();
    const sorted = (values as number[]).sort((a, b) => a - b);
    return sorted.map((nominalBoreMm) => ({ nominalBoreMm }));
  }

  async findByTypeAndSize(
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
  ): Promise<MalleableIronFittingDimension | null> {
    const doc = await this.documents
      .findOne({ fittingType, nominalBoreMm, pressureClass })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
