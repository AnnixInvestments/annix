import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { SupplierDocument } from "../entities/supplier-document.entity";

export interface SupplierDocumentQueryFilters {
  supplierId?: number;
  docType?: string;
}

export abstract class SupplierDocumentRepository extends CrudRepository<SupplierDocument> {
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
