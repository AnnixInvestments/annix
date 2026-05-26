import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";
import { SweepTeeDimensionRepository } from "./sweep-tee-dimension.repository";

@Injectable()
export class MongoSweepTeeDimensionRepository
  extends MongoCrudRepository<SweepTeeDimension>
  implements SweepTeeDimensionRepository
{
  constructor(@InjectModel("SweepTeeDimension") model: Model<SweepTeeDimension>) {
    super(model);
  }

  async findAllOrdered(): Promise<SweepTeeDimension[]> {
    const docs = await this.documents
      .find()
      .sort({ nominalBoreMm: 1, radiusType: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByNominalBore(nominalBoreMm: number): Promise<SweepTeeDimension[]> {
    const docs = await this.documents.find({ nominalBoreMm }).sort({ radiusType: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByRadiusType(radiusType: string): Promise<SweepTeeDimension[]> {
    const docs = await this.documents.find({ radiusType }).sort({ nominalBoreMm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByCriteria(
    nominalBoreMm: number,
    radiusType: string,
  ): Promise<SweepTeeDimension | null> {
    const doc = await this.documents.findOne({ nominalBoreMm, radiusType }).lean().exec();
    return this.toDomain(doc);
  }

  async availableNominalBores(): Promise<number[]> {
    const results = (await this.documents.distinct("nominalBoreMm").exec()) as number[];
    return results.slice().sort((a, b) => a - b);
  }

  async availableRadiusTypes(): Promise<string[]> {
    const results = (await this.documents.distinct("radiusType").exec()) as string[];
    return results.slice().sort();
  }
}
