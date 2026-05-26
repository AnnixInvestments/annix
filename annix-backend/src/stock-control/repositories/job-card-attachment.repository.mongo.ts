import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import { JobCardAttachmentRepository } from "./job-card-attachment.repository";

@Injectable()
export class MongoJobCardAttachmentRepository
  extends MongoCrudRepository<JobCardAttachment>
  implements JobCardAttachmentRepository
{
  constructor(
    @InjectModel("JobCardAttachment")
    model: Model<JobCardAttachment>,
  ) {
    super(model);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<JobCardAttachment[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    attachmentId: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardAttachment | null> {
    const doc = await this.documents
      .findOne({ _id: attachmentId, jobCardId, companyId })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findExtractableForJobCard(
    jobCardId: number,
    companyId: number,
    statuses: ExtractionStatus[],
  ): Promise<JobCardAttachment[]> {
    const docs = await this.documents
      .find({
        jobCardId,
        companyId,
        extractionStatus: { $in: statuses },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateMany(ids: number[], changes: DeepPartial<JobCardAttachment>): Promise<void> {
    await this.documents
      .updateMany({ _id: { $in: ids } }, changes as Record<string, unknown>)
      .exec();
  }

  saveMany(entities: JobCardAttachment[]): Promise<JobCardAttachment[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
