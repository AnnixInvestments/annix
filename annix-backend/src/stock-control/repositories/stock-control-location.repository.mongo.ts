import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlLocation } from "../entities/stock-control-location.entity";
import { StockControlLocationRepository } from "./stock-control-location.repository";

@Injectable()
export class MongoStockControlLocationRepository
  extends MongoTenantScopedRepository<StockControlLocation>
  implements StockControlLocationRepository
{
  constructor(
    @InjectModel("StockControlLocation") model: Model<StockControlLocation>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlLocationRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlLocationRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlLocationRepository {
    return new MongoStockControlLocationRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlLocation,
  ): Promise<StockControlLocation> {
    if (entity.companyId !== companyId) {
      throw new Error("Location does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlLocation): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Location does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ displayOrder: 1, name: 1 })
      .limit(2000)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlLocation | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
