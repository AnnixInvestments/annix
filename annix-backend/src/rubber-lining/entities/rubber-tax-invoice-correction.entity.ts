import { RubberTaxInvoice } from "./rubber-tax-invoice.entity";

export class RubberTaxInvoiceCorrection {
  id: number;

  taxInvoice: RubberTaxInvoice;

  taxInvoiceId: number;

  supplierName: string | null;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  correctedBy: string | null;

  createdAt: Date;
}
