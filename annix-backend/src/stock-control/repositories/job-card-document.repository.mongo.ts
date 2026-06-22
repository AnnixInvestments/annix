import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardDocument } from "../entities/job-card-document.entity";
import { JobCardDocumentRepository } from "./job-card-document.repository";

@Injectable()
export class MongoJobCardDocumentRepository
  extends MongoTenantScopedRepository<JobCardDocument>
  implements JobCardDocumentRepository
{
  constructor(
    @InjectModel("JobCardDocument") model: Model<JobCardDocument>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardDocumentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardDocumentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardDocumentRepository {
    return new MongoJobCardDocumentRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardDocument): Promise<JobCardDocument> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card document does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardDocument): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card document does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findFirstForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument | null> {
    const doc = await this.documents
      .findOne({ jobCardId, companyId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
