import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";

export interface CertificateFilters {
  supplierId?: number;
  stockItemId?: number;
  jobCardId?: number;
  batchNumber?: string;
  certificateType?: string;
}

export abstract class SupplierCertificateRepository extends TenantScopedRepository<SupplierCertificate> {
  abstract withTransaction(context: TransactionContext): SupplierCertificateRepository;
  abstract saveForCompany(
    companyId: number,
    entity: SupplierCertificate,
  ): Promise<SupplierCertificate>;
  abstract removeForCompany(companyId: number, entity: SupplierCertificate): Promise<void>;
  abstract build(data: DeepPartial<SupplierCertificate>): SupplierCertificate;
  abstract updateById(id: number, updates: DeepPartial<SupplierCertificate>): Promise<void>;
  abstract findOneForCompanyByBatchAndType(
    companyId: number,
    supplierId: number,
    batchNumber: string,
    certificateType: string,
  ): Promise<SupplierCertificate | null>;
  abstract findAllFilteredForCompany(
    companyId: number,
    filters: CertificateFilters | undefined,
  ): Promise<SupplierCertificate[]>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierCertificate | null>;
  abstract findByBatchForCompany(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate[]>;
  abstract findForJobCardForCompany(
    companyId: number,
    jobCardId: number,
  ): Promise<SupplierCertificate[]>;
  abstract findOneForCompanyByBatch(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate | null>;
  abstract findBatchSummaryForCompany(companyId: number): Promise<SupplierCertificate[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<SupplierCertificate | null>;
  abstract findNeedingProductExtractionForCompany(
    companyId: number,
  ): Promise<SupplierCertificate[]>;
}
