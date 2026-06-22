import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";

export abstract class JobCardAttachmentRepository extends TenantScopedRepository<JobCardAttachment> {
  abstract withTransaction(context: TransactionContext): JobCardAttachmentRepository;
  abstract saveForCompany(companyId: number, entity: JobCardAttachment): Promise<JobCardAttachment>;
  abstract removeForCompany(companyId: number, entity: JobCardAttachment): Promise<void>;
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
