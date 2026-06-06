import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";

export abstract class JobCardImportJobRepository extends CrudRepository<JobCardImportJob> {
  abstract findActiveForUser(
    companyId: number,
    createdByUserId: number | null,
  ): Promise<JobCardImportJob[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<JobCardImportJob | null>;
  abstract markStaleProcessingFailed(error: string): Promise<number>;
}
