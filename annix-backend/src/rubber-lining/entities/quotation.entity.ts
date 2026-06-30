import { QuotationItemEntity } from "./quotation-item.entity";

export class Quotation {
  id: number;

  customerName: string;

  customerAddress: string | null;

  customerPhone: string | null;

  customerEmail: string | null;

  customerVatNumber: string | null;

  validTo: Date | null;

  affiliateId: number | null;

  items: QuotationItemEntity[];

  subtotal: number;

  vatTotal: number;

  grandTotal: number;

  createdAt: Date;

  updatedAt: Date;
}
