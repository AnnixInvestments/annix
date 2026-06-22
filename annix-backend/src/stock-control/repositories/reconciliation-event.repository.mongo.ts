import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ReconciliationEvent } from "../entities/reconciliation-event.entity";
import { ReconciliationEventRepository } from "./reconciliation-event.repository";

@Injectable()
export class MongoReconciliationEventRepository
  extends MongoTenantScopedRepository<ReconciliationEvent>
  implements ReconciliationEventRepository
{
  constructor(
    @InjectModel("ReconciliationEvent")
    model: Model<ReconciliationEvent>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoReconciliationEventRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoReconciliationEventRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoReconciliationEventRepository {
    return new MongoReconciliationEventRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: ReconciliationEvent,
  ): Promise<ReconciliationEvent> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation event does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: ReconciliationEvent): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation event does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForItemsForCompany(
    companyId: number,
    itemIds: number[],
  ): Promise<ReconciliationEvent[]> {
    const docs = await this.documents
      .find({ companyId, reconciliationItemId: { $in: itemIds } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
