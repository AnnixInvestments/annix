import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { JobCardLineItemRepository } from "./job-card-line-item.repository";

@Injectable()
export class MongoJobCardLineItemRepository
  extends MongoTenantScopedRepository<JobCardLineItem>
  implements JobCardLineItemRepository
{
  constructor(
    @InjectModel("JobCardLineItem") model: Model<JobCardLineItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardLineItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardLineItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardLineItemRepository {
    return new MongoJobCardLineItemRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardLineItem): Promise<JobCardLineItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card line item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardLineItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card line item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardAndCompany(jobCardId: number, companyId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedBySort(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedBySortAnyCompany(jobCardId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId }).sort({ sortOrder: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdAndJobCard(id: number, jobCardId: number): Promise<JobCardLineItem | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId }).lean().exec();
    return this.toDomain(doc);
  }

  countForJobCard(jobCardId: number): Promise<number> {
    return this.documents.countDocuments({ jobCardId }).exec();
  }

  async deleteForJobCard(jobCardId: number): Promise<void> {
    await this.documents.deleteMany({ jobCardId }).exec();
  }

  async saveMany(entities: JobCardLineItem[]): Promise<JobCardLineItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  buildMany(rows: DeepPartial<JobCardLineItem>[]): JobCardLineItem[] {
    return rows as JobCardLineItem[];
  }
}
