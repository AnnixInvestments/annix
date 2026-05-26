import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";

export interface CertificateFilters {
  supplierId?: number;
  stockItemId?: number;
  jobCardId?: number;
  batchNumber?: string;
  certificateType?: string;
}

export abstract class SupplierCertificateRepository extends CrudRepository<SupplierCertificate> {
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
