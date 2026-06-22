import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardVersion } from "../entities/job-card-version.entity";
import { JobCardVersionRepository } from "./job-card-version.repository";

@Injectable()
export class MongoJobCardVersionRepository
  extends MongoTenantScopedRepository<JobCardVersion>
  implements JobCardVersionRepository
{
  constructor(
    @InjectModel("JobCardVersion") model: Model<JobCardVersion>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardVersionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardVersionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardVersionRepository {
    return new MongoJobCardVersionRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardVersion): Promise<JobCardVersion> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card version does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardVersion): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card version does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardVersion[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardVersion | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
