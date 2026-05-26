import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";

export abstract class JobMarketSourceRepository extends CrudRepository<JobMarketSource> {
  abstract findEnabled(): Promise<JobMarketSource[]>;
  abstract findPlatformGlobal(): Promise<JobMarketSource[]>;
  abstract findForCompany(companyId: number): Promise<JobMarketSource[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<JobMarketSource | null>;
  abstract findByIds(ids: number[]): Promise<JobMarketSource[]>;
  abstract sourceIdsForCompany(companyId: number): Promise<number[]>;
  abstract findEnabledByProvider(provider: JobSourceProvider): Promise<JobMarketSource | null>;
}
