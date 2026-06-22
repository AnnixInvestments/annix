import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";
import { InvoiceExtractionCorrectionRepository } from "./invoice-extraction-correction.repository";

@Injectable()
export class MongoInvoiceExtractionCorrectionRepository
  extends MongoTenantScopedRepository<InvoiceExtractionCorrection>
  implements InvoiceExtractionCorrectionRepository
{
  constructor(
    @InjectModel("InvoiceExtractionCorrection")
    model: Model<InvoiceExtractionCorrection>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoInvoiceExtractionCorrectionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoInvoiceExtractionCorrectionRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoInvoiceExtractionCorrectionRepository {
    return new MongoInvoiceExtractionCorrectionRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: InvoiceExtractionCorrection,
  ): Promise<InvoiceExtractionCorrection> {
    if (entity.companyId !== companyId) {
      throw new Error("Invoice extraction correction does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: InvoiceExtractionCorrection): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Invoice extraction correction does not belong to the requesting company");
    }
    await this.remove(entity);
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
