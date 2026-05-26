import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardVersion } from "../entities/job-card-version.entity";

export abstract class JobCardVersionRepository extends CrudRepository<JobCardVersion> {
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardVersion[]>;
  abstract findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardVersion | null>;
}
