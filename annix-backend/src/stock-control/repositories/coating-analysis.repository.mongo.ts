import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCardCoatingAnalysisRepository } from "./coating-analysis.repository";

@Injectable()
export class MongoJobCardCoatingAnalysisRepository
  extends MongoCrudRepository<JobCardCoatingAnalysis>
  implements JobCardCoatingAnalysisRepository
{
  constructor(
    @InjectModel("JobCardCoatingAnalysis")
    model: Model<JobCardCoatingAnalysis>,
  ) {
    super(model);
  }

  async findOneForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    const doc = await this.documents.findOne({ jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findLiningFlagForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ id: number; hasInternalLining: boolean } | null> {
    const doc = await this.documents
      .findOne({ jobCardId, companyId })
      .select("_id hasInternalLining")
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    return {
      id: doc._id as number,
      hasInternalLining: Boolean(doc.hasInternalLining),
    };
  }

  countByStatus(companyId: number, status: CoatingAnalysisStatus): Promise<number> {
    return this.documents.countDocuments({ companyId, status }).exec();
  }

  async findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
