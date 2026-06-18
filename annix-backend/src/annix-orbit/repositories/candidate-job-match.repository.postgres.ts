import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import type { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import type { ExternalJob } from "../entities/external-job.entity";
import {
  CandidateJobMatchRepository,
  type MatchScores,
  type RecommendedFacetRow,
  type RecommendedMatchCountFilters,
} from "./candidate-job-match.repository";

@Injectable()
export class PostgresCandidateJobMatchRepository
  extends TypeOrmCrudRepository<CandidateJobMatch>
  implements CandidateJobMatchRepository
{
  constructor(@InjectRepository(CandidateJobMatch) repository: Repository<CandidateJobMatch>) {
    super(repository);
  }

  findByCandidateAndJob(
    candidateId: number,
    externalJobId: number,
  ): Promise<CandidateJobMatch | null> {
    return this.repository.findOne({ where: { candidateId, externalJobId } });
  }

  async upsertScoredMatch(
    candidateId: number,
    externalJobId: number,
    scores: MatchScores,
  ): Promise<CandidateJobMatch> {
    const existing = await this.repository.findOne({ where: { candidateId, externalJobId } });
    const entity = existing ?? this.repository.create({ candidateId, externalJobId });
    entity.similarityScore = scores.similarityScore;
    entity.structuredScore = scores.structuredScore;
    entity.overallScore = scores.overallScore;
    entity.matchDetails = scores.matchDetails;
    return this.repository.save(entity);
  }

  recommendedJobsForCandidate(
    candidateId: number,
    includeDismissed: boolean,
    limit: number,
    filters: RecommendedMatchCountFilters | null = null,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const qb = this.repository
      .createQueryBuilder("match")
      .innerJoinAndSelect("match.externalJob", "job")
      .where("match.candidate_id = :candidateId", { candidateId })
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .andWhere("job.delisted IS NOT TRUE")
      .orderBy("match.overallScore", "DESC")
      .take(limit);

    if (!includeDismissed) {
      qb.andWhere("match.dismissed = false");
    }
    if (filters?.countries && filters.countries.length > 0) {
      qb.andWhere("job.country IN (:...countries)", { countries: filters.countries });
    }
    if (filters?.category) {
      qb.andWhere("job.canonical_category = :category", { category: filters.category });
    }
    if (filters?.sourceIds && filters.sourceIds.length > 0) {
      qb.andWhere("job.source_id IN (:...sourceIds)", { sourceIds: filters.sourceIds });
    }
    if (filters?.provinces && filters.provinces.length > 0) {
      qb.andWhere("job.canonical_province IN (:...provinces)", { provinces: filters.provinces });
    }
    if (filters?.cities && filters.cities.length > 0) {
      qb.andWhere("job.canonical_city IN (:...cities)", { cities: filters.cities });
    }
    if (filters?.search) {
      qb.andWhere(
        "(LOWER(job.title) LIKE :q OR LOWER(job.company) LIKE :q OR LOWER(job.description) LIKE :q)",
        { q: `%${filters.search.trim().toLowerCase()}%` },
      );
    }
    if (filters?.minSalary != null && filters.minSalary > 0) {
      qb.andWhere(
        "(COALESCE(job.salary_max, job.salary_min) IS NULL OR COALESCE(job.salary_max, job.salary_min) >= :minSalary)",
        { minSalary: filters.minSalary },
      );
    }

    return qb.getMany() as Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
  }

  matchingCandidatesForJob(
    externalJobId: number,
    limit: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>> {
    return this.repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.candidate", "candidate")
      .where("match.external_job_id = :externalJobId", { externalJobId })
      .andWhere("match.dismissed = false")
      .orderBy("match.overallScore", "DESC")
      .take(limit)
      .getMany() as Promise<Array<CandidateJobMatch & { candidate: Candidate }>>;
  }

  async setDismissed(matchId: number, dismissed: boolean, reason?: string | null): Promise<void> {
    const patch: { dismissed: boolean; dismissReason?: string | null } = { dismissed };
    if (reason !== undefined) {
      patch.dismissReason = reason;
    }
    await this.repository.update(matchId, patch);
  }

  findDismissedForCandidate(candidateId: number): Promise<CandidateJobMatch[]> {
    return this.repository.find({ where: { candidateId, dismissed: true } });
  }

  async deleteForCandidates(candidateIds: number[]): Promise<number> {
    if (candidateIds.length === 0) return 0;
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where("candidate_id IN (:...ids)", { ids: candidateIds })
      .execute();
    return result.affected ?? 0;
  }

  countActiveForCandidates(candidateIds: number[]): Promise<number> {
    if (candidateIds.length === 0) return Promise.resolve(0);
    return this.repository
      .createQueryBuilder("match")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false")
      .getCount();
  }

  countRecommendedForCandidates(
    candidateIds: number[],
    filters: RecommendedMatchCountFilters | null,
  ): Promise<number> {
    if (candidateIds.length === 0) return Promise.resolve(0);
    const qb = this.repository
      .createQueryBuilder("match")
      .innerJoin("match.externalJob", "job")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false")
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .andWhere("job.delisted IS NOT TRUE");

    if (filters?.countries && filters.countries.length > 0) {
      qb.andWhere("job.country IN (:...countries)", { countries: filters.countries });
    }
    if (filters?.category) {
      qb.andWhere("job.canonical_category = :category", { category: filters.category });
    }
    if (filters?.sourceIds && filters.sourceIds.length > 0) {
      qb.andWhere("job.source_id IN (:...sourceIds)", { sourceIds: filters.sourceIds });
    }
    if (filters?.provinces && filters.provinces.length > 0) {
      const clauses = filters.provinces.map(
        (_, i) =>
          `(LOWER(job.location_area) LIKE :province${i} OR LOWER(job.location_raw) LIKE :province${i})`,
      );
      const params = Object.fromEntries(
        filters.provinces.map((p, i) => [`province${i}`, `%${p.toLowerCase()}%`]),
      );
      qb.andWhere(`(${clauses.join(" OR ")})`, params);
    }
    if (filters?.cities && filters.cities.length > 0) {
      const clauses = filters.cities.map(
        (_, i) =>
          `(LOWER(job.location_area) LIKE :city${i} OR LOWER(job.location_raw) LIKE :city${i})`,
      );
      const params = Object.fromEntries(
        filters.cities.map((c, i) => [`city${i}`, `%${c.toLowerCase()}%`]),
      );
      qb.andWhere(`(${clauses.join(" OR ")})`, params);
    }
    if (filters?.search) {
      qb.andWhere(
        "(LOWER(job.title) LIKE :q OR LOWER(job.company) LIKE :q OR LOWER(job.description) LIKE :q)",
        { q: `%${filters.search.trim().toLowerCase()}%` },
      );
    }
    if (filters?.minSalary != null && filters.minSalary > 0) {
      qb.andWhere(
        "(COALESCE(job.salary_max, job.salary_min) IS NULL OR COALESCE(job.salary_max, job.salary_min) >= :minSalary)",
        {
          minSalary: filters.minSalary,
        },
      );
    }

    return qb
      .select("COUNT(DISTINCT match.external_job_id)", "total")
      .getRawOne<{ total: string }>()
      .then((row) => (row ? Number(row.total) : 0));
  }

  async facetRowsForCandidates(candidateIds: number[]): Promise<RecommendedFacetRow[]> {
    if (candidateIds.length === 0) return [];
    const rows = await this.repository
      .createQueryBuilder("match")
      .innerJoin("match.externalJob", "job")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false")
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .andWhere("job.delisted IS NOT TRUE")
      .select([
        "job.country AS country",
        'job.canonical_province AS "canonicalProvince"',
        'job.canonical_city AS "canonicalCity"',
        'job.canonical_category AS "canonicalCategory"',
        'job.source_id AS "sourceId"',
        'job.salary_min AS "salaryMin"',
        'job.salary_max AS "salaryMax"',
        "job.title AS title",
        "job.company AS company",
        'job.location_area AS "locationArea"',
        'job.location_raw AS "locationRaw"',
      ])
      .distinct(true)
      .getRawMany<RecommendedFacetRow>();
    return rows;
  }

  countActiveForCandidatesSince(candidateIds: number[], since: Date): Promise<number> {
    if (candidateIds.length === 0) return Promise.resolve(0);
    return this.repository
      .createQueryBuilder("match")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false")
      .andWhere("match.created_at >= :sevenDaysAgo", { sevenDaysAgo: since })
      .getCount();
  }

  weeklyDigestMatches(
    jobPostingIds: number[],
    since: Date,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob; candidate: Candidate }>> {
    return this.repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.externalJob", "job")
      .leftJoinAndSelect("match.candidate", "candidate")
      .where("match.created_at > :since", { since })
      .andWhere(
        "match.candidate_id IN (SELECT id FROM cv_assistant_candidates WHERE job_posting_id IN (:...ids))",
        { ids: jobPostingIds },
      )
      .andWhere("match.overall_score >= 0.7")
      .orderBy("match.overallScore", "DESC")
      .take(10)
      .getMany() as Promise<
      Array<CandidateJobMatch & { externalJob: ExternalJob; candidate: Candidate }>
    >;
  }

  recentMatchesForCandidate(
    candidateId: number,
    since: Date,
    threshold: number,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    return this.repository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.externalJob", "job")
      .where("match.candidate_id = :candidateId", { candidateId })
      .andWhere("match.created_at > :since", { since })
      .andWhere("match.overall_score >= :threshold", { threshold })
      .andWhere("match.dismissed = false")
      .orderBy("match.overallScore", "DESC")
      .take(5)
      .getMany() as Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
  }
}
