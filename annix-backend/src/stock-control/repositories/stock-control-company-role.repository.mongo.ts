import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlCompanyRole } from "../entities/stock-control-company-role.entity";
import { StockControlCompanyRoleRepository } from "./stock-control-company-role.repository";

@Injectable()
export class MongoStockControlCompanyRoleRepository
  extends MongoTenantScopedRepository<StockControlCompanyRole>
  implements StockControlCompanyRoleRepository
{
  constructor(
    @InjectModel("StockControlCompanyRole") model: Model<StockControlCompanyRole>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlCompanyRoleRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlCompanyRoleRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlCompanyRoleRepository {
    return new MongoStockControlCompanyRoleRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlCompanyRole,
  ): Promise<StockControlCompanyRole> {
    if (entity.companyId !== companyId) {
      throw new Error("Company role does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlCompanyRole): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Company role does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForCompanyOrdered(companyId: number): Promise<StockControlCompanyRole[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ sortOrder: 1, _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<StockControlCompanyRole | null> {
    const doc = await this.documents.findOne({ companyId, key }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlCompanyRole | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async maxSortOrderForCompany(companyId: number): Promise<number | null> {
    const doc = await this.documents.findOne({ companyId }).sort({ sortOrder: -1 }).lean().exec();
    if (!doc) {
      return null;
    }
    return (doc as Record<string, unknown>).sortOrder as number;
  }

  async findAllForCompany(companyId: number): Promise<StockControlCompanyRole[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  buildMany(rows: DeepPartial<StockControlCompanyRole>[]): StockControlCompanyRole[] {
    return rows as StockControlCompanyRole[];
  }

  async saveMany(entities: StockControlCompanyRole[]): Promise<StockControlCompanyRole[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
