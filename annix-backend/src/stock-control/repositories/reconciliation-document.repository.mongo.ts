import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ReconciliationDocument } from "../entities/reconciliation-document.entity";
import { ReconciliationDocumentRepository } from "./reconciliation-document.repository";

@Injectable()
export class MongoReconciliationDocumentRepository
  extends MongoTenantScopedRepository<ReconciliationDocument>
  implements ReconciliationDocumentRepository
{
  constructor(
    @InjectModel("ReconciliationDocument")
    model: Model<ReconciliationDocument>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoReconciliationDocumentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoReconciliationDocumentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoReconciliationDocumentRepository {
    return new MongoReconciliationDocumentRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: ReconciliationDocument,
  ): Promise<ReconciliationDocument> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation document does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: ReconciliationDocument): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Reconciliation document does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationDocument[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ documentCategory: 1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<ReconciliationDocument | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findById(id: number): Promise<ReconciliationDocument | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, changes: DeepPartial<ReconciliationDocument>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }
}
