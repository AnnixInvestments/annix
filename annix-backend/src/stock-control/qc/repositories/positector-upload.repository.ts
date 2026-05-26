import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { PositectorUpload } from "../entities/positector-upload.entity";

export abstract class PositectorUploadRepository extends CrudRepository<PositectorUpload> {
  abstract findMissingMeasurementDate(): Promise<PositectorUpload[]>;
  abstract findBundleNamed(): Promise<PositectorUpload[]>;
  abstract findBundleNamedForCompany(companyId: number): Promise<PositectorUpload[]>;
  abstract updateById(id: number, updates: Partial<PositectorUpload>): Promise<void>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]>;
  abstract findByFingerprint(
    companyId: number,
    fingerprint: string,
  ): Promise<PositectorUpload | null>;
  abstract findAllForCompany(companyId: number): Promise<PositectorUpload[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<PositectorUpload | null>;
  abstract findUnlinkedForCompany(
    companyId: number,
    entityType: string | undefined,
  ): Promise<PositectorUpload[]>;
  abstract findUnlinkedByBatchName(
    companyId: number,
    batchName: string,
  ): Promise<PositectorUpload[]>;
  abstract findUnlinkedEnvironmentalInRange(
    companyId: number,
    earliestDate: string,
    latestDate: string,
  ): Promise<PositectorUpload[]>;
  abstract findLinkedToJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]>;
}
