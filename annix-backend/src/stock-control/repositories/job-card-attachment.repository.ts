import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";

export abstract class JobCardAttachmentRepository extends CrudRepository<JobCardAttachment> {
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<JobCardAttachment[]>;
  abstract findOneForJobCard(
    attachmentId: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardAttachment | null>;
  abstract findExtractableForJobCard(
    jobCardId: number,
    companyId: number,
    statuses: ExtractionStatus[],
  ): Promise<JobCardAttachment[]>;
  abstract updateMany(ids: number[], changes: DeepPartial<JobCardAttachment>): Promise<void>;
  abstract saveMany(entities: JobCardAttachment[]): Promise<JobCardAttachment[]>;
}
