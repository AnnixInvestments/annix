import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { CompanyType } from "../entities/rubber-company.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  RubberDeliveryNote,
} from "../entities/rubber-delivery-note.entity";

export interface DeliveryNoteListFilters {
  deliveryNoteType?: DeliveryNoteType;
  status?: DeliveryNoteStatus;
  supplierCompanyId?: number;
  companyType?: CompanyType;
  includeAllVersions?: boolean;
}

export interface DeliveryNotePageFilters extends DeliveryNoteListFilters {
  search?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface DeliveryNotePage {
  items: RubberDeliveryNote[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierDnReconciliationRow {
  id: number;
  deliveryNoteNumber: string | null;
  linkedCocId: number | null;
  versionStatus: string;
}

export abstract class RubberDeliveryNoteRepository extends CrudRepository<RubberDeliveryNote> {
  abstract build(data: Partial<RubberDeliveryNote>): RubberDeliveryNote;
  abstract saveMany(entities: RubberDeliveryNote[]): Promise<RubberDeliveryNote[]>;
  abstract updateById(id: number, updates: DeepPartial<RubberDeliveryNote>): Promise<void>;
  abstract updatePendingToFailed(id: number): Promise<void>;
  abstract deleteById(id: number): Promise<boolean>;
  abstract findFiltered(filters?: DeliveryNoteListFilters): Promise<RubberDeliveryNote[]>;
  abstract findPaginated(
    filters: DeliveryNotePageFilters,
    sortColumnMap: Record<string, string>,
  ): Promise<DeliveryNotePage>;
  abstract documentPathSiblingCounts(docPaths: string[]): Promise<Map<string, number>>;
  abstract findManyByIds(ids: number[]): Promise<RubberDeliveryNote[]>;
  abstract findByNumberAndCompany(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null>;
  abstract findSiblingLinkedDeliveryNote(
    excludeId: number,
    supplierCompanyId: number,
    customerReference: string | null,
  ): Promise<RubberDeliveryNote | null>;
  abstract findRollDeliveryNotesByCompanyIds(companyIds: number[]): Promise<RubberDeliveryNote[]>;
  abstract findUnlinkedBySupplierAndStatuses(
    supplierCompanyId: number,
    statuses: DeliveryNoteStatus[],
  ): Promise<RubberDeliveryNote[]>;
  abstract findAllUnlinked(): Promise<RubberDeliveryNote[]>;
  abstract findLinkedSupplierDeliveryNotes(): Promise<RubberDeliveryNote[]>;
  abstract findAllWithCocLink(): Promise<RubberDeliveryNote[]>;
  abstract findLinkedCustomerDnsNeedingStatusRepair(
    customerIds: number[],
  ): Promise<RubberDeliveryNote[]>;
  abstract findUnlinkedRollDnsByCustomerIds(customerIds: number[]): Promise<RubberDeliveryNote[]>;
  abstract findOneActiveByNumberAndSupplier(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null>;
  abstract findNewerVersionsByPreviousId(id: number): Promise<RubberDeliveryNote[]>;
  abstract repointLinkedCocId(oldId: number, newId: number): Promise<void>;
  abstract findIdsWithRollsButNoItems(): Promise<number[]>;
  abstract findSupplierDnReconciliationRows(
    companyId: number,
  ): Promise<SupplierDnReconciliationRow[]>;
}
