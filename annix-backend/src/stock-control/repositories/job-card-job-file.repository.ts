import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";

export abstract class JobCardJobFileRepository extends CrudRepository<JobCardJobFile> {
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardJobFile[]>;
  abstract findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardJobFile | null>;
  abstract findById(id: number): Promise<JobCardJobFile | null>;
  abstract updateById(id: number, changes: DeepPartial<JobCardJobFile>): Promise<void>;
  abstract countImageFiles(jobCardId: number, companyId: number): Promise<number>;
}
