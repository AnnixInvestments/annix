import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";
import { JobCardJobFileRepository } from "./job-card-job-file.repository";

@Injectable()
export class MongoJobCardJobFileRepository
  extends MongoCrudRepository<JobCardJobFile>
  implements JobCardJobFileRepository
{
  constructor(@InjectModel("JobCardJobFile") model: Model<JobCardJobFile>) {
    super(model);
  }

  async findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardJobFile[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardJobFile | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findById(id: number): Promise<JobCardJobFile | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, changes: DeepPartial<JobCardJobFile>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  countImageFiles(jobCardId: number, companyId: number): Promise<number> {
    return this.documents
      .countDocuments({
        jobCardId,
        companyId,
        mimeType: { $in: ["image/jpeg", "image/png", "image/jpg"] },
      })
      .exec();
  }
}
