import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlDepartment } from "../entities/stock-control-department.entity";
import { StockControlDepartmentRepository } from "./stock-control-department.repository";

@Injectable()
export class MongoStockControlDepartmentRepository
  extends MongoTenantScopedRepository<StockControlDepartment>
  implements StockControlDepartmentRepository
{
  constructor(
    @InjectModel("StockControlDepartment") model: Model<StockControlDepartment>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlDepartmentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlDepartmentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlDepartmentRepository {
    return new MongoStockControlDepartmentRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlDepartment,
  ): Promise<StockControlDepartment> {
    if (entity.companyId !== companyId) {
      throw new Error("Department does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlDepartment): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Department does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ displayOrder: 1, name: 1 })
      .limit(2000)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlDepartment | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
