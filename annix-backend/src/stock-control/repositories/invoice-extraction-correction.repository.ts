import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";

export abstract class InvoiceExtractionCorrectionRepository extends CrudRepository<InvoiceExtractionCorrection> {
  abstract createMany(
    rows: Array<DeepPartial<InvoiceExtractionCorrection>>,
  ): Promise<InvoiceExtractionCorrection[]>;
  abstract findRecentForSupplier(
    companyId: number,
    supplierName: string,
    limit: number,
  ): Promise<InvoiceExtractionCorrection[]>;
}
