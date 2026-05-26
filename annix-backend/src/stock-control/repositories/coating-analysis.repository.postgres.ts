import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCardCoatingAnalysisRepository } from "./coating-analysis.repository";

@Injectable()
export class PostgresJobCardCoatingAnalysisRepository
  extends TypeOrmCrudRepository<JobCardCoatingAnalysis>
  implements JobCardCoatingAnalysisRepository
{
  constructor(
    @InjectRepository(JobCardCoatingAnalysis)
    repository: Repository<JobCardCoatingAnalysis>,
  ) {
    super(repository);
  }

  findOneForJobCard(companyId: number, jobCardId: number): Promise<JobCardCoatingAnalysis | null> {
    return this.repository.findOne({
      where: { jobCardId, companyId },
    });
  }

  findLiningFlagForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ id: number; hasInternalLining: boolean } | null> {
    return this.repository.findOne({
      where: { jobCardId, companyId },
      select: { id: true, hasInternalLining: true },
    });
  }

  countByStatus(companyId: number, status: CoatingAnalysisStatus): Promise<number> {
    return this.repository.count({ where: { companyId, status } });
  }

  findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }
}
