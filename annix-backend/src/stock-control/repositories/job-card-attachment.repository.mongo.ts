import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import { JobCardAttachmentRepository } from "./job-card-attachment.repository";

@Injectable()
export class MongoJobCardAttachmentRepository
  extends MongoTenantScopedRepository<JobCardAttachment>
  implements JobCardAttachmentRepository
{
  constructor(
    @InjectModel("JobCardAttachment")
    model: Model<JobCardAttachment>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardAttachmentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardAttachmentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardAttachmentRepository {
    return new MongoJobCardAttachmentRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardAttachment): Promise<JobCardAttachment> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card attachment does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardAttachment): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card attachment does not belong to the requesting company");
    }
    await this.remove(entity);
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
