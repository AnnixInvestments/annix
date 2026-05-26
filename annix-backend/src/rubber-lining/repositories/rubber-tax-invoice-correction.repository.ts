import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberTaxInvoiceCorrection } from "../entities/rubber-tax-invoice-correction.entity";

export abstract class RubberTaxInvoiceCorrectionRepository extends CrudRepository<RubberTaxInvoiceCorrection> {
  abstract build(data: Partial<RubberTaxInvoiceCorrection>): RubberTaxInvoiceCorrection;
  abstract saveMany(entities: RubberTaxInvoiceCorrection[]): Promise<RubberTaxInvoiceCorrection[]>;
  abstract findRecentBySupplierName(
    supplierName: string,
    limit: number,
  ): Promise<RubberTaxInvoiceCorrection[]>;
}
