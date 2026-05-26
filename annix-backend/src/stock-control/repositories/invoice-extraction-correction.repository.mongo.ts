import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";
import { InvoiceExtractionCorrectionRepository } from "./invoice-extraction-correction.repository";

@Injectable()
export class MongoInvoiceExtractionCorrectionRepository
  extends MongoCrudRepository<InvoiceExtractionCorrection>
  implements InvoiceExtractionCorrectionRepository
{
  constructor(
    @InjectModel("InvoiceExtractionCorrection")
    model: Model<InvoiceExtractionCorrection>,
  ) {
    super(model);
  }

  createMany(
    rows: Array<DeepPartial<InvoiceExtractionCorrection>>,
  ): Promise<InvoiceExtractionCorrection[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findRecentForSupplier(
    companyId: number,
    supplierName: string,
    limit: number,
  ): Promise<InvoiceExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId, supplierName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
