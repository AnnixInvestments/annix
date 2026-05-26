import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitCandidateEeAttributes } from "../entities/annix-orbit-candidate-ee-attributes.entity";
import {
  AnnixOrbitCandidateEeAttributesRepository,
  EeDemographicRow,
  EeReportRow,
} from "./annix-orbit-candidate-ee-attributes.repository";

@Injectable()
export class PostgresAnnixOrbitCandidateEeAttributesRepository
  extends TypeOrmCrudRepository<AnnixOrbitCandidateEeAttributes>
  implements AnnixOrbitCandidateEeAttributesRepository
{
  constructor(
    @InjectRepository(AnnixOrbitCandidateEeAttributes)
    repository: Repository<AnnixOrbitCandidateEeAttributes>,
  ) {
    super(repository);
  }

  findActiveForCandidate(candidateId: number): Promise<AnnixOrbitCandidateEeAttributes | null> {
    return this.repository.findOne({
      where: { candidateId, deletedAt: IsNull() },
    });
  }

  async tombstoneActiveForCandidate(candidateId: number, deletedAt: Date): Promise<number> {
    const result = await this.repository.update(
      { candidateId, deletedAt: IsNull() },
      { deletedAt },
    );
    return result.affected ?? 0;
  }

  aggregateForJob(jobPostingId: number): Promise<EeDemographicRow[]> {
    return this.repository
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .where("candidate.job_posting_id = :jobPostingId", { jobPostingId })
      .andWhere("ee.deleted_at IS NULL")
      .select([
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .getRawMany<EeDemographicRow>();
  }

  aggregateForCompany(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<EeDemographicRow[]> {
    return this.repository
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .innerJoin(
        "cv_assistant_job_postings",
        "job_posting",
        "job_posting.id = candidate.job_posting_id",
      )
      .where("job_posting.company_id = :companyId", { companyId })
      .andWhere("ee.deleted_at IS NULL")
      .andWhere("ee.consent_granted_at >= :dateFrom", { dateFrom })
      .andWhere("ee.consent_granted_at < :dateTo", { dateTo })
      .select([
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .getRawMany<EeDemographicRow>();
  }

  reportRows(companyId: number, dateFrom: Date, dateTo: Date): Promise<EeReportRow[]> {
    return this.repository
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .innerJoin(
        "cv_assistant_job_postings",
        "job_posting",
        "job_posting.id = candidate.job_posting_id",
      )
      .where("job_posting.company_id = :companyId", { companyId })
      .andWhere("ee.deleted_at IS NULL")
      .andWhere("ee.consent_granted_at >= :dateFrom", { dateFrom })
      .andWhere("ee.consent_granted_at < :dateTo", { dateTo })
      .select([
        "candidate.id AS candidate_id",
        "candidate.status AS candidate_status",
        "job_posting.occupational_level AS occupational_level",
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .getRawMany<EeReportRow>();
  }
}
