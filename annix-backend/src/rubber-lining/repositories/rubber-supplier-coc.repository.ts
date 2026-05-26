import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "../entities/rubber-supplier-coc.entity";

export interface SupplierCocListFilters {
  cocType?: SupplierCocType;
  processingStatus?: CocProcessingStatus;
  supplierCompanyId?: number;
  includeAllVersions?: boolean;
  versionStatus?: DocumentVersionStatus;
}

export interface SupplierCocExportFilters {
  dateFrom?: string;
  dateTo?: string;
  excludeExported?: boolean;
}

export abstract class RubberSupplierCocRepository extends CrudRepository<RubberSupplierCoc> {
  abstract build(data: Partial<RubberSupplierCoc>): RubberSupplierCoc;
  abstract saveMany(entities: RubberSupplierCoc[]): Promise<RubberSupplierCoc[]>;
  abstract updateById(id: number, updates: DeepPartial<RubberSupplierCoc>): Promise<void>;
  abstract deleteById(id: number): Promise<boolean>;
  abstract findByCocTypeSelectingIdentity(cocType: SupplierCocType): Promise<RubberSupplierCoc[]>;
  abstract findIdsMissingCocNumber(): Promise<number[]>;
  abstract findForListing(filters?: SupplierCocListFilters): Promise<RubberSupplierCoc[]>;
  abstract findPendingAuthorizationWithCompany(): Promise<RubberSupplierCoc[]>;
  abstract findByIdWithCompany(id: number): Promise<RubberSupplierCoc | null>;
  abstract findSiblingsByDocumentPathExcludingId(
    documentPath: string,
    id: number,
  ): Promise<RubberSupplierCoc[]>;
  abstract findOneByDocumentHash(documentHash: string): Promise<RubberSupplierCoc | null>;
  abstract findMissingDocumentHash(): Promise<RubberSupplierCoc[]>;
  abstract markExtractionFailedIfPending(id: number): Promise<void>;
  abstract findCalenderRollSiblingsByDocumentPath(
    documentPath: string | null,
  ): Promise<RubberSupplierCoc[]>;
  abstract findActiveWithCocNumber(): Promise<RubberSupplierCoc[]>;
  abstract deleteAllAndResetSequence(): Promise<number>;
  abstract countByVersionStatus(versionStatus: DocumentVersionStatus): Promise<number>;
  abstract findByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]>;
  abstract findByCocTypeWithCompany(cocType: SupplierCocType): Promise<RubberSupplierCoc[]>;
  abstract findActiveByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]>;
  abstract findCompoundersByCompoundCodes(codes: string[]): Promise<RubberSupplierCoc[]>;
  abstract findOneCalenderRollByOrderNumber(orderNumber: string): Promise<RubberSupplierCoc | null>;
  abstract findOneByCocTypeAndOrderNumberLatest(
    cocType: SupplierCocType,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null>;
  abstract findByIds(ids: number[]): Promise<RubberSupplierCoc[]>;
  abstract findByIdsWithCompany(ids: number[]): Promise<RubberSupplierCoc[]>;
  abstract findIdAndCocNumberByIds(ids: number[]): Promise<RubberSupplierCoc[]>;
  abstract findExportable(filters: SupplierCocExportFilters): Promise<RubberSupplierCoc[]>;
  abstract markExportedByIds(ids: number[], exportedAt: Date): Promise<void>;
  abstract findBySupplierCompanyIdLatest(companyId: number): Promise<RubberSupplierCoc[]>;
  abstract findByVersionStatus(versionStatus: DocumentVersionStatus): Promise<RubberSupplierCoc[]>;
  abstract findOneCalendererByCompanyAndExtractedOrder(
    companyId: number,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null>;
  abstract findOneCompounderByBatchNumbersOverlap(
    batchNumbers: string[],
  ): Promise<RubberSupplierCoc | null>;
  abstract findByCocTypeWithOrderNumber(cocType: SupplierCocType): Promise<RubberSupplierCoc[]>;
  abstract distinctCompoundCodesByCocType(cocType: SupplierCocType): Promise<string[]>;
  abstract findOneActiveByNormalizedNumberAndType(
    normalizedCocNumber: string,
    cocType: SupplierCocType,
    options?: { excludeId?: number; supplierCompanyId?: number },
  ): Promise<RubberSupplierCoc | null>;
  abstract findNewerVersionsByPreviousId(id: number): Promise<RubberSupplierCoc[]>;
  abstract repointLinkedDeliveryNoteId(oldId: number, newId: number): Promise<void>;
  abstract findWithOrderNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]>;
  abstract findUpstreamCocsByCdnRollTrace(cdnId: number): Promise<RubberSupplierCoc[]>;
  abstract findActiveWithCocNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]>;
}
