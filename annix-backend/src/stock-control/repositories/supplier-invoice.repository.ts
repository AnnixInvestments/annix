import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";

export interface SageExportInvoiceFilters {
  dateFrom?: string;
  dateTo?: string;
  excludeExported?: boolean;
}

export abstract class SupplierInvoiceRepository extends CrudRepository<SupplierInvoice> {
  abstract build(data: DeepPartial<SupplierInvoice>): SupplierInvoice;
  abstract updateById(id: number, updates: DeepPartial<SupplierInvoice>): Promise<void>;
  abstract updateManyByIdsForCompany(
    ids: number[],
    companyId: number,
    updates: DeepPartial<SupplierInvoice>,
  ): Promise<void>;
  abstract findOneById(id: number): Promise<SupplierInvoice | null>;
  abstract findOneByIdWithRelations(
    id: number,
    relations: string[],
  ): Promise<SupplierInvoice | null>;
  abstract findOneForCompany(id: number, companyId: number): Promise<SupplierInvoice | null>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierInvoice | null>;
  abstract findForCompanyWithDeliveryNotePaginated(
    companyId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<SupplierInvoice[]>;
  abstract findStaleProcessingForCompany(
    companyId: number,
    threshold: Date,
  ): Promise<SupplierInvoice[]>;
  abstract findFailedForCompany(companyId: number): Promise<SupplierInvoice[]>;
  abstract findUnlinkedForCompany(companyId: number): Promise<SupplierInvoice[]>;
  abstract countByExtractionStatusForCompany(
    companyId: number,
    status: InvoiceExtractionStatus,
  ): Promise<number>;
  abstract countByExtractionStatusesForCompany(
    companyId: number,
    statuses: InvoiceExtractionStatus[],
  ): Promise<number>;
  abstract countCompletedSinceForCompany(companyId: number, since: Date): Promise<number>;
  abstract searchSummaryForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<SupplierInvoice[]>;
  abstract findExportableForCompany(
    companyId: number,
    filters: SageExportInvoiceFilters,
  ): Promise<SupplierInvoice[]>;
}
