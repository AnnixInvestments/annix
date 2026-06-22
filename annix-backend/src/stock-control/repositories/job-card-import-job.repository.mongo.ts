import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";
import { JobCardImportJobRepository } from "./job-card-import-job.repository";

@Injectable()
export class MongoJobCardImportJobRepository
  extends MongoTenantScopedRepository<JobCardImportJob>
  implements JobCardImportJobRepository
{
  constructor(
    @InjectModel("JobCardImportJob")
    model: Model<JobCardImportJob>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardImportJobRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardImportJobRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardImportJobRepository {
    return new MongoJobCardImportJobRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardImportJob): Promise<JobCardImportJob> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card import job does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardImportJob): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card import job does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findActiveForUser(
    companyId: number,
    createdByUserId: number | null,
  ): Promise<JobCardImportJob[]> {
    const docs = await this.documents
      .find({
        companyId,
        createdByUserId,
        acknowledged: false,
        status: { $in: ["processing", "completed", "failed"] },
      })
      .sort({ _id: -1 })
      .limit(10)
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc)).filter((doc): doc is JobCardImportJob => !!doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<JobCardImportJob | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async markStaleProcessingFailed(error: string): Promise<number> {
    const result = await this.documents
      .updateMany({ status: "processing" }, { $set: { status: "failed", error } })
      .exec();
    return result.modifiedCount ?? 0;
  }
}
