import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";

export abstract class JobCardCoatingAnalysisRepository extends CrudRepository<JobCardCoatingAnalysis> {
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
