import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { JobCardDataBookRepository } from "./job-card-data-book.repository";

@Injectable()
export class MongoJobCardDataBookRepository
  extends MongoTenantScopedRepository<JobCardDataBook>
  implements JobCardDataBookRepository
{
  constructor(
    @InjectModel("JobCardDataBook") model: Model<JobCardDataBook>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardDataBookRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardDataBookRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardDataBookRepository {
    return new MongoJobCardDataBookRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardDataBook): Promise<JobCardDataBook> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card data book does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardDataBook): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card data book does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardDataBook | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ generatedAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForJobCardIds(companyId: number, jobCardIds: number[]): Promise<JobCardDataBook[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId: { $in: jobCardIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
