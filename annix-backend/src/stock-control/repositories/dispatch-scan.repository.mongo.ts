import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { DispatchScanRepository } from "./dispatch-scan.repository";

@Injectable()
export class MongoDispatchScanRepository
  extends MongoTenantScopedRepository<DispatchScan>
  implements DispatchScanRepository
{
  constructor(
    @InjectModel("DispatchScan") model: Model<DispatchScan>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDispatchScanRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDispatchScanRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDispatchScanRepository {
    return new MongoDispatchScanRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: DispatchScan): Promise<DispatchScan> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch scan does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DispatchScan): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch scan does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardItem(jobCardId: number, stockItemId: number): Promise<DispatchScan[]> {
    const docs = await this.documents.find({ jobCardId, stockItemId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findHistoryForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .populate("stockItem")
      .populate("scannedBy")
      .sort({ scannedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithJobCard(
    scanId: number,
    companyId: number,
  ): Promise<DispatchScan | null> {
    const doc = await this.documents
      .findOne({ _id: scanId, companyId })
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
