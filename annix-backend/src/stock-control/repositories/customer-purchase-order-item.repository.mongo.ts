import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { CustomerPurchaseOrderItemRepository } from "./customer-purchase-order-item.repository";

@Injectable()
export class MongoCustomerPurchaseOrderItemRepository
  extends MongoTenantScopedRepository<CustomerPurchaseOrderItem>
  implements CustomerPurchaseOrderItemRepository
{
  constructor(
    @InjectModel("CustomerPurchaseOrderItem")
    model: Model<CustomerPurchaseOrderItem>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoCustomerPurchaseOrderItemRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoCustomerPurchaseOrderItemRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoCustomerPurchaseOrderItemRepository {
    return new MongoCustomerPurchaseOrderItemRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: CustomerPurchaseOrderItem,
  ): Promise<CustomerPurchaseOrderItem> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO item does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: CustomerPurchaseOrderItem): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO item does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  createMany(
    rows: Array<DeepPartial<CustomerPurchaseOrderItem>>,
  ): Promise<CustomerPurchaseOrderItem[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findOneForCpoAndCompany(
    id: number,
    cpoId: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrderItem | null> {
    const doc = await this.documents.findOne({ _id: id, cpoId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCpo(id: number, cpoId: number): Promise<CustomerPurchaseOrderItem | null> {
    const doc = await this.documents.findOne({ _id: id, cpoId }).lean().exec();
    return this.toDomain(doc);
  }

  async findForCpoOrdered(cpoId: number, companyId: number): Promise<CustomerPurchaseOrderItem[]> {
    const docs = await this.documents
      .find({ cpoId, companyId })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<CustomerPurchaseOrderItem>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  async deleteForCpo(cpoId: number): Promise<void> {
    await this.documents.deleteMany({ cpoId }).exec();
  }
}
