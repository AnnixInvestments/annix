import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import {
  CandidateAllForCompanyFilters,
  CandidateEmbeddingCoverageRow,
  CandidateRepository,
} from "./candidate.repository";

@Injectable()
export class PostgresCandidateRepository
  extends TypeOrmCrudRepository<Candidate>
  implements CandidateRepository
{
  constructor(@InjectRepository(Candidate) repository: Repository<Candidate>) {
    super(repository);
  }

  findByJobPosting(jobPostingId: number, status?: string): Promise<Candidate[]> {
    const query: Record<string, unknown> = { jobPostingId };
    if (status) {
      query.status = status;
    }
    return this.repository.find({
      where: query,
      order: { matchScore: "DESC", createdAt: "DESC" },
      relations: ["references"],
    });
  }

  findByIdWithJobAndReferences(id: number): Promise<Candidate | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["jobPosting", "references"],
    });
  }

  findByIdWithJobPosting(id: number): Promise<Candidate | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["jobPosting"],
    });
  }

  findByIdWithJobAndReferencesRelations(id: number): Promise<Candidate | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["jobPosting", "references"],
    });
  }

  findAllForCompany(
    companyId: number,
    filters?: CandidateAllForCompanyFilters,
  ): Promise<Candidate[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .leftJoinAndSelect("candidate.references", "references")
      .where("jobPosting.companyId = :companyId", { companyId });

    if (filters?.status) {
      queryBuilder.andWhere("candidate.status = :status", { status: filters.status });
    }

    if (filters?.jobPostingId) {
      queryBuilder.andWhere("candidate.jobPostingId = :jobPostingId", {
        jobPostingId: filters.jobPostingId,
      });
    }

    return queryBuilder
      .orderBy("candidate.matchScore", "DESC", "NULLS LAST")
      .addOrderBy("candidate.createdAt", "DESC")
      .getMany();
  }

  topCandidates(companyId: number, limit: number): Promise<Candidate[]> {
    return this.repository
      .createQueryBuilder("candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId })
      .andWhere("candidate.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [CandidateStatus.REJECTED],
      })
      .orderBy("candidate.matchScore", "DESC", "NULLS LAST")
      .limit(limit)
      .getMany();
  }

  candidatesForCompany(companyId: number): Promise<Candidate[]> {
    return this.repository
      .createQueryBuilder("candidate")
      .innerJoin("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId })
      .getMany();
  }

  candidatesMatchingTrades(tradeKeys: string[]): Promise<Candidate[]> {
    if (tradeKeys.length === 0) return Promise.resolve([]);
    return this.repository
      .createQueryBuilder("c")
      .where(`c.trade_profile -> 'shared' -> 'tradeKeys' ?| ARRAY[:...keys]`, { keys: tradeKeys })
      .getMany();
  }

  candidatesMissingEmbedding(): Promise<Candidate[]> {
    return this.repository
      .createQueryBuilder("c")
      .where("c.embedding IS NULL")
      .andWhere("(c.raw_cv_text IS NOT NULL OR c.extracted_data IS NOT NULL)")
      .getMany();
  }

  async embeddingCoverage(): Promise<CandidateEmbeddingCoverageRow> {
    const [row] = await this.repository.query(
      "SELECT COUNT(*)::int AS total, COUNT(embedding)::int AS embedded FROM cv_assistant_candidates",
    );
    return { total: Number(row.total), embedded: Number(row.embedded) };
  }

  listNonFixture(params: {
    search: string | null;
    skip: number;
    limit: number;
  }): Promise<[Candidate[], number]> {
    const query = this.repository
      .createQueryBuilder("candidate")
      .where("candidate.isTestFixture = :fixture", { fixture: false });
    if (params.search) {
      query.andWhere("(candidate.email ILIKE :term OR candidate.name ILIKE :term)", {
        term: `%${params.search}%`,
      });
    }
    return query
      .orderBy("candidate.createdAt", "DESC")
      .skip(params.skip)
      .take(params.limit)
      .getManyAndCount();
  }

  findByEmail(email: string): Promise<Candidate[]> {
    return this.repository.find({ where: { email } });
  }

  findByEmailWithJobPosting(email: string): Promise<Candidate[]> {
    return this.repository.find({ where: { email }, relations: ["jobPosting"] });
  }

  findByEmailWithJobAndReferences(email: string): Promise<Candidate[]> {
    return this.repository.find({ where: { email }, relations: ["jobPosting", "references"] });
  }

  findInactiveBefore(cutoff: Date): Promise<Candidate[]> {
    return this.repository.find({
      where: [
        { lastActiveAt: LessThan(cutoff) },
        { lastActiveAt: null as unknown as Date, createdAt: LessThan(cutoff) },
      ],
      relations: ["references"],
    });
  }

  async markRejectionSent(id: number, rejectionSentAt: Date): Promise<void> {
    await this.repository.update(id, {
      rejectionSentAt,
      status: CandidateStatus.REJECTED,
    });
  }

  async markAcceptanceSent(id: number, acceptanceSentAt: Date): Promise<void> {
    await this.repository.update(id, { acceptanceSentAt });
  }

  async deleteTestFixturesForJob(jobPostingId: number): Promise<number> {
    const result = await this.repository.delete({ jobPostingId, isTestFixture: true });
    return result.affected ?? 0;
  }

  async setEmbeddingVector(id: number, embeddingLiteral: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Candidate)
      .set({ embedding: () => `'[${embeddingLiteral}]'::vector` } as never)
      .where("id = :id", { id })
      .execute();
  }

  async clearEmbedding(id: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Candidate)
      .set({ embedding: null } as never)
      .where("id = :id", { id })
      .execute();
  }

  async updateTradeProfile(id: number, tradeProfile: unknown): Promise<void> {
    await this.repository.update(id, { tradeProfile } as never);
  }

  async updateMatchTier(id: number, matchTier: string): Promise<void> {
    await this.repository.update(id, { matchTier });
  }

  async touchLastActiveByEmail(
    email: string,
    now: Date,
    staleBefore: Date,
    _dayKey: string,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Candidate)
      .set({ lastActiveAt: now })
      .where("email = :email", { email })
      .andWhere("(last_active_at IS NULL OR last_active_at < :staleBefore)", { staleBefore })
      .execute();
  }

  async seekerActivityDaysForEmail(
    _email: string,
    _sinceKey: string,
  ): Promise<Array<{ day: string; count: number }>> {
    return [];
  }

  async grantMatchingConsent(ids: number[], consentedAt: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ popiaConsent: true, popiaConsentedAt: consentedAt, jobAlertsOptIn: true })
      .where("id IN (:...ids)", { ids })
      .execute();
  }

  async withdrawMatching(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ embedding: null, jobAlertsOptIn: false })
      .where("id IN (:...ids)", { ids })
      .execute();
  }

  candidatesWithEmbedding(): Promise<Candidate[]> {
    return this.repository.createQueryBuilder("c").where("c.embedding IS NOT NULL").getMany();
  }

  jobAlertCandidates(): Promise<Candidate[]> {
    return this.repository.find({ where: { jobAlertsOptIn: true, popiaConsent: true } });
  }

  countForCompanyByStatuses(
    companyId: number,
    statuses: string[] | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<number> {
    const qb = this.repository
      .createQueryBuilder("c")
      .innerJoin("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId });
    if (dateFrom) {
      qb.andWhere("c.createdAt >= :dateFrom", { dateFrom });
    }
    if (dateTo) {
      qb.andWhere("c.createdAt <= :dateTo", { dateTo });
    }
    if (statuses) {
      qb.andWhere("c.status IN (:...statuses)", { statuses });
    }
    return qb.getCount();
  }

  async matchAccuracyData(
    companyId: number,
  ): Promise<Array<{ matchScore: number | null; status: string }>> {
    const rows = await this.repository
      .createQueryBuilder("c")
      .innerJoin("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId })
      .andWhere("c.matchScore IS NOT NULL")
      .select(["c.matchScore", "c.status"])
      .getMany();
    return rows.map((r) => ({ matchScore: r.matchScore, status: r.status }));
  }

  funnelExportCandidates(
    companyId: number,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<Candidate[]> {
    const qb = this.repository
      .createQueryBuilder("c")
      .innerJoinAndSelect("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId })
      .orderBy("c.createdAt", "DESC");
    if (dateFrom) {
      qb.andWhere("c.createdAt >= :dateFrom", { dateFrom });
    }
    if (dateTo) {
      qb.andWhere("c.createdAt <= :dateTo", { dateTo });
    }
    return qb.getMany();
  }

  countNewForJobsSince(jobPostingIds: number[], since: Date): Promise<number> {
    if (jobPostingIds.length === 0) return Promise.resolve(0);
    return this.repository
      .createQueryBuilder("c")
      .where("c.job_posting_id IN (:...ids)", { ids: jobPostingIds })
      .andWhere("c.created_at > :since", { since })
      .getCount();
  }

  fairnessRows(
    jobPostingId: number,
    screeningStatuses: string[],
    windowSize: number,
  ): Promise<
    Array<{
      candidate_id: number;
      status: string;
      population_group: string;
      gender: string;
      disability_status: string;
      nationality_status: string;
    }>
  > {
    return this.repository
      .createQueryBuilder("c")
      .innerJoin(
        "cv_assistant_candidate_ee_attributes",
        "ee",
        "ee.candidate_id = c.id AND ee.deleted_at IS NULL",
      )
      .where("c.job_posting_id = :jobPostingId", { jobPostingId })
      .andWhere("c.status IN (:...screeningStatuses)", { screeningStatuses })
      .select([
        "c.id AS candidate_id",
        "c.status AS status",
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .orderBy("c.createdAt", "DESC")
      .limit(windowSize)
      .getRawMany();
  }
}
