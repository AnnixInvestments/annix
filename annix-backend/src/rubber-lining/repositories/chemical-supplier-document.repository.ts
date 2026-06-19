import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ChemicalSupplierDocument } from "../entities/chemical-supplier-document.entity";
import { CocProcessingStatus } from "../entities/rubber-supplier-coc.entity";

export interface ChemicalSupplierDocumentListFilters {
  supplierCompanyId?: number;
  processingStatus?: CocProcessingStatus;
  search?: string;
}

export abstract class ChemicalSupplierDocumentRepository extends CrudRepository<ChemicalSupplierDocument> {
  abstract build(data: Partial<ChemicalSupplierDocument>): ChemicalSupplierDocument;
  abstract listWithFilters(
    filters: ChemicalSupplierDocumentListFilters,
  ): Promise<ChemicalSupplierDocument[]>;
  abstract findByIdWithCompany(id: number): Promise<ChemicalSupplierDocument | null>;
  abstract findOneByDocumentHashWithCompany(
    documentHash: string,
  ): Promise<ChemicalSupplierDocument | null>;
  abstract updateById(id: number, updates: DeepPartial<ChemicalSupplierDocument>): Promise<void>;
}
