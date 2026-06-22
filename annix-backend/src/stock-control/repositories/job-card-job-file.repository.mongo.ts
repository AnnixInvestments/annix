import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";
import { JobCardJobFileRepository } from "./job-card-job-file.repository";

@Injectable()
export class MongoJobCardJobFileRepository
  extends MongoTenantScopedRepository<JobCardJobFile>
  implements JobCardJobFileRepository
{
  constructor(
    @InjectModel("JobCardJobFile") model: Model<JobCardJobFile>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardJobFileRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardJobFileRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardJobFileRepository {
    return new MongoJobCardJobFileRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardJobFile): Promise<JobCardJobFile> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card job file does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardJobFile): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card job file does not belong to the requesting company");
    }
    await this.remove(entity);
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
