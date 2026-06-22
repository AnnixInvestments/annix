import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import {
  ClarificationStatus,
  ClarificationType,
  InvoiceClarification,
} from "../entities/invoice-clarification.entity";
import { InvoiceClarificationRepository } from "./invoice-clarification.repository";

@Injectable()
export class MongoInvoiceClarificationRepository
  extends MongoTenantScopedRepository<InvoiceClarification>
  implements InvoiceClarificationRepository
{
  constructor(
    @InjectModel("InvoiceClarification")
    model: Model<InvoiceClarification>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoInvoiceClarificationRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoInvoiceClarificationRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoInvoiceClarificationRepository {
    return new MongoInvoiceClarificationRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: InvoiceClarification,
  ): Promise<InvoiceClarification> {
    if (entity.companyId !== companyId) {
      throw new Error("Invoice clarification does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: InvoiceClarification): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Invoice clarification does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  countByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus | string,
  ): Promise<number> {
    return this.documents.countDocuments({ invoiceId, status }).exec();
  }

  async deleteForInvoice(invoiceId: number): Promise<void> {
    await this.documents.deleteMany({ invoiceId }).exec();
  }

  async findOneByIdWithRelations(clarificationId: number): Promise<InvoiceClarification | null> {
    const doc = await this.documents
      .findById(clarificationId)
      .populate("invoiceItem")
      .populate("invoice")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByInvoiceItemAndStatus(
    invoiceItemId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]> {
    const docs = await this.documents.find({ invoiceItemId, status }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]> {
    const docs = await this.documents.find({ invoiceId, status }).lean().exec();
    return this.toDomainList(docs);
  }

  async findSkippedPriceForInvoice(invoiceId: number): Promise<InvoiceClarification[]> {
    const docs = await this.documents
      .find({
        invoiceId,
        clarificationType: ClarificationType.PRICE_CONFIRMATION,
        status: ClarificationStatus.SKIPPED,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingForInvoiceWithItem(invoiceId: number): Promise<InvoiceClarification[]> {
    const docs = await this.documents
      .find({ invoiceId, status: ClarificationStatus.PENDING })
      .populate("invoiceItem")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  saveMany(entities: InvoiceClarification[]): Promise<InvoiceClarification[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
