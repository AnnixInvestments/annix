import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { RequisitionItemRepository } from "./requisition-item.repository";

@Injectable()
export class MongoRequisitionItemRepository
  extends MongoTenantScopedRepository<RequisitionItem>
  implements RequisitionItemRepository
{
  constructor(
    @InjectModel("RequisitionItem") model: Model<RequisitionItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoRequisitionItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRequisitionItemRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoRequisitionItemRepository {
    return new MongoRequisitionItemRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: RequisitionItem): Promise<RequisitionItem> {
    if (entity.companyId !== companyId) {
      throw new Error("Requisition item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: RequisitionItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Requisition item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneForCompanyWithStockItem(
    id: number,
    companyId: number,
  ): Promise<RequisitionItem | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("stockItem")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForRequisition(
    id: number,
    requisitionId: number,
    companyId: number,
  ): Promise<RequisitionItem | null> {
    const doc = await this.documents.findOne({ _id: id, requisitionId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  buildMany(rows: DeepPartial<RequisitionItem>[]): RequisitionItem[] {
    return rows as RequisitionItem[];
  }

  async saveManyForCompany(
    companyId: number,
    entities: RequisitionItem[],
  ): Promise<RequisitionItem[]> {
    const foreign = entities.find((entity) => entity.companyId !== companyId);
    if (foreign) {
      throw new Error("Requisition item does not belong to the requesting company");
    }
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
