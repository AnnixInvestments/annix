import type { SageExportFilterDto } from "../dto/sage-export.dto";
import type { SageExportInvoice } from "./sage-invoice";

export interface SageAdapterContext {
  companyId: number | null;
  appKey: string;
}

export interface SageExportResult {
  invoices: SageExportInvoice[];
  entityIds: number[];
}

export interface SageExportPreview {
  count: number;
  lineItemCount: number;
  totalAmount: number;
}

export interface SageInvoiceAdapter {
  exportableInvoices(
    filters: SageExportFilterDto,
    context: SageAdapterContext,
  ): Promise<SageExportResult>;

  markExported(entityIds: number[], context: SageAdapterContext): Promise<void>;

  previewCount(
    filters: SageExportFilterDto,
    context: SageAdapterContext,
  ): Promise<SageExportPreview>;
}
