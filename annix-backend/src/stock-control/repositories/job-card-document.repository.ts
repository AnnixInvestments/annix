import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardDocument } from "../entities/job-card-document.entity";

export abstract class JobCardDocumentRepository extends CrudRepository<JobCardDocument> {
  abstract findFirstForJobCard(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardDocument | null>;
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardDocument[]>;
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument[]>;
}
