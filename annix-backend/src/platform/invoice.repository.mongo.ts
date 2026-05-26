import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import type { InvoiceFilterDto } from "./dto/invoice.dto";
import { PlatformInvoice } from "./entities/invoice.entity";
import { InvoiceRepository } from "./invoice.repository";
import type { InvoicePage } from "./invoice.service";

@Injectable()
export class MongoInvoiceRepository
  extends MongoCrudRepository<PlatformInvoice>
  implements InvoiceRepository
{
  constructor(@InjectModel("PlatformInvoice") model: Model<PlatformInvoice>) {
    super(model);
  }

  async search(companyId: number, filters: InvoiceFilterDto): Promise<InvoicePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { companyId, versionStatus: "ACTIVE" };

    if (filters.sourceModule) {
      query.sourceModule = filters.sourceModule;
    }
    if (filters.invoiceType) {
      query.invoiceType = filters.invoiceType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.extractionStatus) {
      query.extractionStatus = filters.extractionStatus;
    }
    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [{ invoiceNumber: re }, { supplierName: re }];
    }
    if (filters.dateFrom) {
      query.invoiceDate = {
        ...((query.invoiceDate as object) || {}),
        $gte: new Date(filters.dateFrom),
      };
    }
    if (filters.dateTo) {
      query.invoiceDate = {
        ...((query.invoiceDate as object) || {}),
        $lte: new Date(filters.dateTo),
      };
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { data: this.toDomainList(documents), total, page, limit };
  }

  async findByCompanyAndId(
    companyId: number,
    id: number,
    _relations: string[] = [],
  ): Promise<PlatformInvoice | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyScId(id: number): Promise<PlatformInvoice | null> {
    const document = await this.documents.findOne({ legacyScInvoiceId: id }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyRubberId(id: number): Promise<PlatformInvoice | null> {
    const document = await this.documents.findOne({ legacyRubberInvoiceId: id }).lean().exec();
    return this.toDomain(document);
  }
}
