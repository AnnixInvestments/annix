import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCuttingTraining } from "../entities/rubber-cutting-training.entity";
import { RubberCuttingTrainingRepository } from "./rubber-cutting-training.repository";

@Injectable()
export class MongoRubberCuttingTrainingRepository
  extends MongoCrudRepository<RubberCuttingTraining>
  implements RubberCuttingTrainingRepository
{
  constructor(
    @InjectModel("RubberCuttingTraining")
    model: Model<RubberCuttingTraining>,
  ) {
    super(model);
  }

  async findOneForCompanyByFingerprint(
    companyId: number,
    panelFingerprint: string,
  ): Promise<RubberCuttingTraining | null> {
    const doc = await this.documents.findOne({ companyId, panelFingerprint }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyById(
    companyId: number,
    id: number,
  ): Promise<RubberCuttingTraining | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findById(id: number): Promise<RubberCuttingTraining | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, changes: DeepPartial<RubberCuttingTraining>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  async findExactMatches(
    companyId: number,
    panelFingerprint: string,
  ): Promise<RubberCuttingTraining[]> {
    const docs = await this.documents
      .find({ companyId, panelFingerprint })
      .sort({ feedbackScore: -1, usageCount: -1 })
      .limit(3)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findSimilarByPanelCount(
    companyId: number,
    minCount: number,
    maxCount: number,
  ): Promise<RubberCuttingTraining[]> {
    const docs = await this.documents
      .find({ companyId, panelCount: { $gte: minCount, $lte: maxCount } })
      .sort({ feedbackScore: -1, usageCount: -1 })
      .limit(5)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async incrementTimesSuggested(ids: number[]): Promise<void> {
    await this.documents.updateMany({ _id: { $in: ids } }, { $inc: { timesSuggested: 1 } }).exec();
  }
}
