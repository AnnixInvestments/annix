import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  ClarificationStatus,
  ClarificationType,
  InvoiceClarification,
} from "../entities/invoice-clarification.entity";
import { InvoiceClarificationRepository } from "./invoice-clarification.repository";

@Injectable()
export class MongoInvoiceClarificationRepository
  extends MongoCrudRepository<InvoiceClarification>
  implements InvoiceClarificationRepository
{
  constructor(
    @InjectModel("InvoiceClarification")
    model: Model<InvoiceClarification>,
  ) {
    super(model);
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
