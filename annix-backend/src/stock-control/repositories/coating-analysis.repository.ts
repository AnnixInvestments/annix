import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";

export abstract class JobCardCoatingAnalysisRepository extends TenantScopedRepository<JobCardCoatingAnalysis> {
  abstract withTransaction(context: TransactionContext): JobCardCoatingAnalysisRepository;
  abstract saveForCompany(
    companyId: number,
    entity: JobCardCoatingAnalysis,
  ): Promise<JobCardCoatingAnalysis>;
  abstract removeForCompany(companyId: number, entity: JobCardCoatingAnalysis): Promise<void>;
  abstract findOneForCompany(id: number, companyId: number): Promise<JobCardCoatingAnalysis | null>;
  abstract findOneForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null>;
  abstract findLiningFlagForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ id: number; hasInternalLining: boolean } | null>;
  abstract countByStatus(companyId: number, status: CoatingAnalysisStatus): Promise<number>;
  abstract findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null>;
}
