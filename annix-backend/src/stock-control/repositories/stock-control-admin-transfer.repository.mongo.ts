import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";
import { StockControlAdminTransferRepository } from "./stock-control-admin-transfer.repository";

@Injectable()
export class MongoStockControlAdminTransferRepository
  extends MongoTenantScopedRepository<StockControlAdminTransfer>
  implements StockControlAdminTransferRepository
{
  constructor(
    @InjectModel("StockControlAdminTransfer")
    model: Model<StockControlAdminTransfer>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlAdminTransferRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoStockControlAdminTransferRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlAdminTransferRepository {
    return new MongoStockControlAdminTransferRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlAdminTransfer,
  ): Promise<StockControlAdminTransfer> {
    if (entity.companyId !== companyId) {
      throw new Error("Admin transfer does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlAdminTransfer): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Admin transfer does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findPendingForCompany(companyId: number): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ companyId, status: AdminTransferStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingForCompanyWithInitiator(
    companyId: number,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ companyId, status: AdminTransferStatus.PENDING })
      .populate(nestPopulate(["initiatedBy", "initiatedBy.company"]))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId, status: AdminTransferStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByStatusToken(
    token: string,
    status: AdminTransferStatus,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents.findOne({ token, status }).lean().exec();
    return this.toDomain(doc);
  }
}
