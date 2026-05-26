import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcItemsRelease } from "../entities/qc-items-release.entity";

export abstract class QcItemsReleaseRepository extends CrudRepository<QcItemsRelease> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcItemsRelease[]>;
  abstract findForCpo(companyId: number, cpoId: number): Promise<QcItemsRelease[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcItemsRelease | null>;
  abstract findAllForJobCard(jobCardId: number, companyId: number): Promise<QcItemsRelease[]>;
  abstract findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcItemsRelease[]>;
  abstract removeMany(entities: QcItemsRelease[]): Promise<void>;
  abstract findChildReleasesInWindow(
    companyId: number,
    windowStart: Date,
    windowEnd: Date,
    createdById: number | null,
  ): Promise<QcItemsRelease[]>;
}
