import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import {
  type SageExportInvoiceFilters,
  SupplierInvoiceRepository,
} from "./supplier-invoice.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoSupplierInvoiceRepository
  extends MongoCrudRepository<SupplierInvoice>
  implements SupplierInvoiceRepository
{
  constructor(@InjectModel("SupplierInvoice") model: Model<SupplierInvoice>) {
    super(model);
  }

  build(data: DeepPartial<SupplierInvoice>): SupplierInvoice {
    return data as SupplierInvoice;
  }

  async updateById(id: number, updates: DeepPartial<SupplierInvoice>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async updateManyByIdsForCompany(
    ids: number[],
    companyId: number,
    updates: DeepPartial<SupplierInvoice>,
  ): Promise<void> {
    await this.documents.updateMany({ _id: { $in: ids }, companyId }, { $set: updates }).exec();
  }

  async findOneById(id: number): Promise<SupplierInvoice | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithRelations(id: number, relations: string[]): Promise<SupplierInvoice | null> {
    const doc = await this.documents.findById(id).populate(relations).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<SupplierInvoice | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierInvoice | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(relations)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForCompanyWithDeliveryNotePaginated(
    companyId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<SupplierInvoice[]> {
    const filter: Record<string, unknown> = { companyId };
    const trimmed = (search ?? "").trim();
    if (trimmed !== "") {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      filter.$or = [{ invoiceNumber: rx }, { supplierName: rx }];
    }
    const docs = await this.documents
      .find(filter)
      .populate(["deliveryNote"])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findStaleProcessingForCompany(
    companyId: number,
    threshold: Date,
  ): Promise<SupplierInvoice[]> {
    const docs = await this.documents
      .find({
        companyId,
        extractionStatus: InvoiceExtractionStatus.PROCESSING,
        updatedAt: { $lt: threshold },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findFailedForCompany(companyId: number): Promise<SupplierInvoice[]> {
    const docs = await this.documents
      .find({ companyId, extractionStatus: InvoiceExtractionStatus.FAILED })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUnlinkedForCompany(companyId: number): Promise<SupplierInvoice[]> {
    const docs = await this.documents
      .find({ companyId, deliveryNoteId: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countByExtractionStatusForCompany(
    companyId: number,
    status: InvoiceExtractionStatus,
  ): Promise<number> {
    return this.documents.countDocuments({ companyId, extractionStatus: status }).exec();
  }

  countByExtractionStatusesForCompany(
    companyId: number,
    statuses: InvoiceExtractionStatus[],
  ): Promise<number> {
    return this.documents.countDocuments({ companyId, extractionStatus: { $in: statuses } }).exec();
  }

  countCompletedSinceForCompany(companyId: number, since: Date): Promise<number> {
    return this.documents
      .countDocuments({
        companyId,
        extractionStatus: InvoiceExtractionStatus.COMPLETED,
        createdAt: { $gte: since },
      })
      .exec();
  }

  async searchSummaryForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<SupplierInvoice[]> {
    const term = pattern.replace(/%/g, "");
    const regex = { $regex: escapeRegex(term), $options: "i" };
    const docs = await this.documents
      .find({
        companyId,
        $or: [{ invoiceNumber: regex }, { supplierName: regex }],
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExportableForCompany(
    companyId: number,
    filters: SageExportInvoiceFilters,
  ): Promise<SupplierInvoice[]> {
    const query: Record<string, unknown> = {
      companyId,
      extractionStatus: InvoiceExtractionStatus.COMPLETED,
      approvedBy: { $ne: null },
    };

    const invoiceDate: Record<string, unknown> = {};
    if (filters.dateFrom) {
      invoiceDate.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      invoiceDate.$lte = filters.dateTo;
    }
    if (Object.keys(invoiceDate).length > 0) {
      query.invoiceDate = invoiceDate;
    }
    if (filters.excludeExported) {
      query.exportedToSageAt = null;
    }

    const docs = await this.documents
      .find(query)
      .populate(["items"])
      .sort({ invoiceDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
