import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlSupplierRepository } from "./stock-control-supplier.repository";

@Injectable()
export class MongoStockControlSupplierRepository
  extends MongoTenantScopedRepository<StockControlSupplier>
  implements StockControlSupplierRepository
{
  constructor(
    @InjectModel("StockControlSupplier") model: Model<StockControlSupplier>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlSupplierRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlSupplierRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlSupplierRepository {
    return new MongoStockControlSupplierRepository(this.model, session);
  }

  build(data: DeepPartial<StockControlSupplier>): StockControlSupplier {
    return data as StockControlSupplier;
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlSupplier,
  ): Promise<StockControlSupplier> {
    if (entity.companyId !== companyId) {
      throw new Error("Supplier does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlSupplier): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Supplier does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllForCompanyOrderedByName(companyId: number): Promise<StockControlSupplier[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ name: 1 })
      .limit(2000)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(companyId: number): Promise<StockControlSupplier[]> {
    const docs = await this.documents.find({ companyId }).limit(2000).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlSupplier | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyByNameCaseInsensitive(
    companyId: number,
    name: string,
  ): Promise<StockControlSupplier | null> {
    const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const doc = await this.documents.findOne({ companyId, name: pattern }).lean().exec();
    return this.toDomain(doc);
  }
}
