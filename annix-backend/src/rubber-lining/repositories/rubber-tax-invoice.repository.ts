import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "../entities/rubber-tax-invoice.entity";

export interface TaxInvoiceListFilters {
  invoiceType?: TaxInvoiceType;
  status?: TaxInvoiceStatus;
  companyId?: number;
  includeAllVersions?: boolean;
  isCreditNote?: boolean;
}

export interface TaxInvoicePageFilters extends TaxInvoiceListFilters {
  search?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface TaxInvoicePage {
  items: RubberTaxInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EligibleSageInvoiceFilters {
  invoiceType: TaxInvoiceType;
  search?: string;
  includeAllVersions?: boolean;
}

export interface CompanyStatementRow {
  companyId: number;
  companyName: string;
  companyCode: string | null;
  emailConfig: Record<string, string> | null;
  invoiceCount: number;
  total: number;
  vatTotal: number;
}

export interface ExportableInvoiceFilters {
  invoiceType: TaxInvoiceType;
  dateFrom?: string;
  dateTo?: string;
  excludeExported?: boolean;
  invoiceId?: number;
}

export abstract class RubberTaxInvoiceRepository extends CrudRepository<RubberTaxInvoice> {
  abstract build(data: Partial<RubberTaxInvoice>): RubberTaxInvoice;
  abstract saveMany(entities: RubberTaxInvoice[]): Promise<RubberTaxInvoice[]>;
  abstract deleteById(id: number): Promise<boolean>;
  abstract updateById(id: number, updates: DeepPartial<RubberTaxInvoice>): Promise<void>;
  abstract updatePendingToFailed(id: number): Promise<void>;
  abstract findOneByIdWithCompany(id: number): Promise<RubberTaxInvoice | null>;
  abstract findOneByIdWithCompanyAndOriginal(id: number): Promise<RubberTaxInvoice | null>;
  abstract findManyByIdsWithCompany(ids: number[]): Promise<RubberTaxInvoice[]>;
  abstract findFilteredWithRelations(filters?: TaxInvoiceListFilters): Promise<RubberTaxInvoice[]>;
  abstract findPaginated(
    filters: TaxInvoicePageFilters,
    sortColumnMap: Record<string, string>,
  ): Promise<TaxInvoicePage>;
  abstract eligibleSageInvoiceIds(filters: EligibleSageInvoiceFilters): Promise<number[]>;
  abstract companyStatementRows(invoiceType: TaxInvoiceType): Promise<CompanyStatementRow[]>;
  abstract findExportableInvoices(filters: ExportableInvoiceFilters): Promise<RubberTaxInvoice[]>;
  abstract markExportedToSage(ids: number[]): Promise<void>;
  abstract findOneByNormalizedRefAndCompany(
    normalizedRef: string,
    companyId: number,
  ): Promise<RubberTaxInvoice | null>;
  abstract findApprovedSupplierInvoicesInPeriod(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<RubberTaxInvoice[]>;
  abstract findActiveSupplierInvoicesForReconciliation(
    companyId: number,
  ): Promise<RubberTaxInvoice[]>;
  abstract findApprovedInvoicesForPeriod(
    invoiceType: TaxInvoiceType,
    startDate: string,
    endDate: string,
    companyId?: number,
  ): Promise<RubberTaxInvoice[]>;
  abstract findRecentSupplierInvoices(
    companyId: number,
    limit: number,
  ): Promise<RubberTaxInvoice[]>;
  abstract findOneActiveByNumberCompanyAndType(
    invoiceNumber: string,
    companyId: number,
    invoiceType: TaxInvoiceType,
  ): Promise<RubberTaxInvoice | null>;
  abstract findNewerVersionsByPreviousId(id: number): Promise<RubberTaxInvoice[]>;
}
