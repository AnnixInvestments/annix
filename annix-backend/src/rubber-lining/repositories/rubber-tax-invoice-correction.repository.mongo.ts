import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberTaxInvoiceCorrection } from "../entities/rubber-tax-invoice-correction.entity";
import { RubberTaxInvoiceCorrectionRepository } from "./rubber-tax-invoice-correction.repository";

@Injectable()
export class MongoRubberTaxInvoiceCorrectionRepository
  extends MongoCrudRepository<RubberTaxInvoiceCorrection>
  implements RubberTaxInvoiceCorrectionRepository
{
  constructor(
    @InjectModel("RubberTaxInvoiceCorrection")
    model: Model<RubberTaxInvoiceCorrection>,
  ) {
    super(model);
  }

  build(data: Partial<RubberTaxInvoiceCorrection>): RubberTaxInvoiceCorrection {
    return data as RubberTaxInvoiceCorrection;
  }

  async saveMany(entities: RubberTaxInvoiceCorrection[]): Promise<RubberTaxInvoiceCorrection[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async findRecentBySupplierName(
    supplierName: string,
    limit: number,
  ): Promise<RubberTaxInvoiceCorrection[]> {
    const docs = await this.documents
      .find({ supplierName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
