export interface SageExportInvoice {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  totalAmount: number | null;
  vatAmount: number | null;
  reference: string | null;
  lineItems: SageExportLineItem[];
}

export interface SageExportLineItem {
  description: string;
  quantity: number;
  unitPrice: number | null;
  vatRate: number;
  accountCode: string;
}
