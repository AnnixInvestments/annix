import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobPostingPortalPosting } from "../entities/job-posting-portal-posting.entity";

export abstract class JobPostingPortalPostingRepository extends CrudRepository<JobPostingPortalPosting> {
  abstract findByJobAndPortal(
    jobPostingId: number,
    portalCode: string,
  ): Promise<JobPostingPortalPosting | null>;
  abstract findRetryDue(now: Date, limit: number): Promise<JobPostingPortalPosting[]>;
}
