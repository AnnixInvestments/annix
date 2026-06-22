import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { StockControlRbacConfigRepository } from "./stock-control-rbac-config.repository";

@Injectable()
export class MongoStockControlRbacConfigRepository
  extends MongoTenantScopedRepository<StockControlRbacConfig>
  implements StockControlRbacConfigRepository
{
  constructor(
    @InjectModel("StockControlRbacConfig") model: Model<StockControlRbacConfig>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlRbacConfigRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlRbacConfigRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlRbacConfigRepository {
    return new MongoStockControlRbacConfigRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlRbacConfig,
  ): Promise<StockControlRbacConfig> {
    if (entity.companyId !== companyId) {
      throw new Error("RBAC config does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlRbacConfig): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("RBAC config does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForCompany(companyId: number): Promise<StockControlRbacConfig[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
