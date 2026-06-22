import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { SupplierDocument } from "../entities/supplier-document.entity";

export interface SupplierDocumentQueryFilters {
  supplierId?: number;
  docType?: string;
}

export abstract class SupplierDocumentRepository extends TenantScopedRepository<SupplierDocument> {
  abstract withTransaction(context: TransactionContext): SupplierDocumentRepository;
  abstract saveForCompany(companyId: number, entity: SupplierDocument): Promise<SupplierDocument>;
  abstract removeForCompany(companyId: number, entity: SupplierDocument): Promise<void>;
  abstract build(data: DeepPartial<SupplierDocument>): SupplierDocument;
  abstract findAllFilteredForCompany(
    companyId: number,
    filters: SupplierDocumentQueryFilters,
  ): Promise<SupplierDocument[]>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierDocument | null>;
  abstract updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<SupplierDocument>,
  ): Promise<void>;
  abstract deleteByIdForCompany(id: number, companyId: number): Promise<void>;
}
