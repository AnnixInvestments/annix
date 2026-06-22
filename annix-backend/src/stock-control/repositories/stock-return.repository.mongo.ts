import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockReturn } from "../entities/stock-return.entity";
import { StockReturnRepository } from "./stock-return.repository";

@Injectable()
export class MongoStockReturnRepository
  extends MongoTenantScopedRepository<StockReturn>
  implements StockReturnRepository
{
  constructor(
    @InjectModel("StockReturn") model: Model<StockReturn>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockReturnRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockReturnRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockReturnRepository {
    return new MongoStockReturnRepository(this.model, session);
  }

  async deleteByJobCardForCompany(companyId: number, jobCardId: number): Promise<void> {
    await this.documents.deleteMany({ companyId, jobCardId }).exec();
  }
}
