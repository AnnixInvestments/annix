import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import { StockControlActionPermissionRepository } from "./stock-control-action-permission.repository";

@Injectable()
export class MongoStockControlActionPermissionRepository
  extends MongoTenantScopedRepository<StockControlActionPermission>
  implements StockControlActionPermissionRepository
{
  constructor(
    @InjectModel("StockControlActionPermission")
    model: Model<StockControlActionPermission>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlActionPermissionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoStockControlActionPermissionRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlActionPermissionRepository {
    return new MongoStockControlActionPermissionRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlActionPermission,
  ): Promise<StockControlActionPermission> {
    if (entity.companyId !== companyId) {
      throw new Error("Action permission does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlActionPermission): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Action permission does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForCompany(companyId: number): Promise<StockControlActionPermission[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
