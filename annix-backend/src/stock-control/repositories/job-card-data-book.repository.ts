import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";

export abstract class JobCardDataBookRepository extends CrudRepository<JobCardDataBook> {
  abstract findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardDataBook | null>;
  abstract findForJobCardIds(companyId: number, jobCardIds: number[]): Promise<JobCardDataBook[]>;
}
