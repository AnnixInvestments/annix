import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobPostingPortalPosting } from "../entities/job-posting-portal-posting.entity";

export abstract class JobPostingPortalPostingRepository extends CrudRepository<JobPostingPortalPosting> {
  abstract findByJobAndPortal(
    jobPostingId: number,
    portalCode: string,
  ): Promise<JobPostingPortalPosting | null>;
  abstract findByJob(jobPostingId: number): Promise<JobPostingPortalPosting[]>;
  abstract findRetryDue(now: Date, limit: number): Promise<JobPostingPortalPosting[]>;
  /** Sum of recorded cost for a company on a channel since `since` (budget guard). */
  abstract sumCostSince(companyId: number, portalCode: string, since: Date): Promise<number>;
}
