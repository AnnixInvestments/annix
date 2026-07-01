import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobPosting } from "../entities/job-posting.entity";

export abstract class JobPostingRepository extends CrudRepository<JobPosting> {
  abstract withTransaction(context: TransactionContext): JobPostingRepository;
  abstract findByCompany(companyId: number, status?: string): Promise<JobPosting[]>;
  abstract findByIds(ids: number[]): Promise<JobPosting[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<JobPosting | null>;
  abstract findByIdForCompanyWithCandidates(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null>;
  abstract findWizardDraft(id: number, companyId: number): Promise<JobPosting | null>;
  abstract findByIdForCompanyWithCompany(id: number, companyId: number): Promise<JobPosting | null>;
  abstract findByIdForCompanyWithWizardRelations(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null>;
  abstract findByIdForCompanyWithSkillsAndMetrics(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null>;
  abstract findByIdForCompanyWithSkills(id: number, companyId: number): Promise<JobPosting | null>;
  abstract activeForCompany(companyId: number): Promise<JobPosting[]>;
  abstract activeForFeed(): Promise<JobPosting[]>;
  abstract findActiveExpired(asOf: Date, limit: number): Promise<JobPosting[]>;
  abstract findActiveByReferenceNumber(referenceNumber: string): Promise<JobPosting | null>;
  abstract findByReferenceNumber(referenceNumber: string): Promise<JobPosting | null>;
  abstract activePublicJobs(search?: string): Promise<JobPosting[]>;
  abstract closedForCompanyWithCandidates(companyId: number): Promise<JobPosting[]>;
  abstract activeJobsForFairness(): Promise<JobPosting[]>;
}
