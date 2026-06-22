import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ReconciliationItem } from "../entities/reconciliation-item.entity";
import { ReconciliationItemRepository } from "./reconciliation-item.repository";

@Injectable()
export class MongoReconciliationItemRepository
  extends MongoTenantScopedRepository<ReconciliationItem>
  implements ReconciliationItemRepository
{
  constructor(
    @InjectModel("ReconciliationItem")
    model: Model<ReconciliationItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoReconciliationItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoReconciliationItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoReconciliationItemRepository {
    return new MongoReconciliationItemRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: ReconciliationItem): Promise<ReconciliationItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: ReconciliationItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardOrdered(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<ReconciliationItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async maxSortOrder(companyId: number, jobCardId: number): Promise<number> {
    const top = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ sortOrder: -1 })
      .lean()
      .exec();
    const row = top as Record<string, unknown> | null;
    return row ? ((row.sortOrder as number) ?? -1) : -1;
  }

  buildMany(rows: DeepPartial<ReconciliationItem>[]): ReconciliationItem[] {
    return rows as ReconciliationItem[];
  }

  async saveManyForCompany(
    companyId: number,
    entities: ReconciliationItem[],
  ): Promise<ReconciliationItem[]> {
    const foreign = entities.find((entity) => entity.companyId !== companyId);
    if (foreign) {
      throw new Error("Reconciliation item does not belong to the requesting company");
    }
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
