import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";

export abstract class InvoiceExtractionCorrectionRepository extends TenantScopedRepository<InvoiceExtractionCorrection> {
  abstract withTransaction(context: TransactionContext): InvoiceExtractionCorrectionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: InvoiceExtractionCorrection,
  ): Promise<InvoiceExtractionCorrection>;
  abstract removeForCompany(companyId: number, entity: InvoiceExtractionCorrection): Promise<void>;
  abstract createMany(
    rows: Array<DeepPartial<InvoiceExtractionCorrection>>,
  ): Promise<InvoiceExtractionCorrection[]>;
  abstract findRecentForSupplier(
    companyId: number,
    supplierName: string,
    limit: number,
  ): Promise<InvoiceExtractionCorrection[]>;
}
