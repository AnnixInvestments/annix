import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThan, MoreThan, Repository } from "typeorm";
import { DateTime } from "../../lib/datetime";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ExternalJob } from "../entities/external-job.entity";
import {
  DedupCandidateRow,
  DelistReportRow,
  DuplicateJobPair,
  EmbeddingCoverageRow,
  ExternalJobListOptions,
  ExternalJobRepository,
  MarketCategoryRow,
  MarketLocationRow,
  MarketSalaryRow,
  MonthlyJobRow,
  PendingCategoryJob,
  PerSourceJobCount,
  VettingUpdate,
} from "./external-job.repository";

@Injectable()
export class PostgresExternalJobRepository
  extends TypeOrmCrudRepository<ExternalJob>
  implements ExternalJobRepository
{
  constructor(@InjectRepository(ExternalJob) repository: Repository<ExternalJob>) {
    super(repository);
  }

  findByIdWithSource(id: number): Promise<ExternalJob | null> {
    return this.repository.findOne({ where: { id }, relations: ["source"] });
  }

  async externalJobsForCompany(
    companyId: number,
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.repository
      .createQueryBuilder("job")
      .innerJoin("job.source", "source")
      .where("source.company_id = :companyId", { companyId });

    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    qb.orderBy("job.postedAt", "DESC", "NULLS LAST")
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  async platformGlobalExternalJobs(
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.repository
      .createQueryBuilder("job")
      .innerJoin("job.source", "source")
      .where("source.company_id IS NULL")
      .andWhere("(job.accepts_za IS NULL OR job.accepts_za = true)")
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .andWhere("job.delisted IS NOT TRUE");

    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    qb.orderBy("job.postedAt", "DESC", "NULLS LAST")
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  jobsWithEmbedding(categoryPool: string[] | null): Promise<ExternalJob[]> {
    const qb = this.repository.createQueryBuilder("job").where("job.embedding IS NOT NULL");
    if (categoryPool !== null && categoryPool.length > 0) {
      qb.andWhere("job.canonical_category IN (:...categoryPool)", { categoryPool });
    }
    return qb.getMany();
  }

  findPendingVetting(limit: number): Promise<ExternalJob[]> {
    return this.repository.find({ where: { acceptsZa: IsNull() }, take: limit });
  }

  async updateVetting(id: number, update: VettingUpdate): Promise<void> {
    await this.repository.update(id, {
      acceptsZa: update.acceptsZa,
      vettingNotes: update.vettingNotes,
      vettedAt: update.vettedAt,
    });
  }

  publicExternalJobs(options: ExternalJobListOptions): Promise<ExternalJob[]> {
    const qb = this.repository.createQueryBuilder("job").where("job.delisted IS NOT TRUE");
    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }
    qb.orderBy("job.postedAt", "DESC", "NULLS LAST");
    return qb.getMany();
  }

  findByExternalIds(externalIds: string[], sourceId: number): Promise<ExternalJob[]> {
    return this.repository.find({
      where: { sourceExternalId: In(externalIds), sourceId },
      select: ["sourceExternalId"],
    });
  }

  jobsMissingEmbedding(): Promise<ExternalJob[]> {
    return this.repository.createQueryBuilder("j").where("j.embedding IS NULL").getMany();
  }

  async embeddingCoverage(): Promise<EmbeddingCoverageRow> {
    const [row] = await this.repository.query(
      "SELECT COUNT(*)::int AS total, COUNT(embedding)::int AS embedded FROM cv_assistant_external_jobs",
    );
    return { total: Number(row.total), embedded: Number(row.embedded) };
  }

  async canonicalCategoryCoverage(): Promise<{ total: number; classified: number }> {
    const [row] = await this.repository.query(
      "SELECT COUNT(*)::int AS total, COUNT(canonical_category)::int AS classified FROM cv_assistant_external_jobs",
    );
    return { total: Number(row.total), classified: Number(row.classified) };
  }

  countForSourceSince(sourceId: number, since: Date): Promise<number> {
    return this.repository.count({
      where: { sourceId, createdAt: MoreThan(since) },
    });
  }

  countForSources(sourceIds: number[]): Promise<number> {
    if (sourceIds.length === 0) return Promise.resolve(0);
    return this.repository
      .createQueryBuilder("job")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .getCount();
  }

  countForSourcesSince(sourceIds: number[], since: Date): Promise<number> {
    if (sourceIds.length === 0) return Promise.resolve(0);
    return this.repository
      .createQueryBuilder("job")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.created_at >= :since", { since })
      .getCount();
  }

  async setEmbeddingVector(id: number, embeddingLiteral: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(ExternalJob)
      .set({ embedding: () => `'[${embeddingLiteral}]'::vector` } as never)
      .where("id = :id", { id })
      .execute();
  }

  async updateLocation(id: number, lat: number, lon: number): Promise<void> {
    await this.repository.update(id, { locationLat: lat, locationLon: lon });
  }

  async findDuplicateCanonicalJob(
    title: string,
    sourceId: number,
    country: string,
    normalisedLocation: string,
    normalisedCompany: string,
  ): Promise<ExternalJob | null> {
    const result = await this.repository.query(
      `
      SELECT j.id
      FROM cv_assistant_external_jobs j
      WHERE LOWER(j.country) = LOWER($1)
        AND j.source_id <> $2
        AND similarity(LOWER(j.title), LOWER($3)) > 0.6
        AND (
          ($4 = '' OR LOWER(COALESCE(j.location_area, '')) = $4)
          OR ($5 = '' OR LOWER(COALESCE(j.company, '')) LIKE '%' || $5 || '%')
        )
      ORDER BY similarity(LOWER(j.title), LOWER($3)) DESC
      LIMIT 1
      `,
      [country, sourceId, title, normalisedLocation, normalisedCompany],
    );
    if (!result || result.length === 0) {
      return null;
    }
    return this.repository.findOne({ where: { id: result[0].id } });
  }

  coldStartJobs(locationTokens: string[], limit: number): Promise<ExternalJob[]> {
    const qb = this.repository
      .createQueryBuilder("job")
      .where("job.country = :country", { country: "za" })
      .andWhere("job.delisted IS NOT TRUE");

    if (locationTokens.length > 0) {
      const conditions = locationTokens
        .map((_, idx) => `LOWER(COALESCE(job.location_raw, '')) LIKE :loc${idx}`)
        .join(" OR ");
      const params = locationTokens.reduce<Record<string, string>>(
        (acc, loc, idx) => Object.assign(acc, { [`loc${idx}`]: `%${loc}%` }),
        {},
      );
      qb.andWhere(`(${conditions})`, params);
    }

    return qb.orderBy("job.postedAt", "DESC", "NULLS LAST").take(limit).getMany();
  }

  coldStartFallbackJobs(limit: number): Promise<ExternalJob[]> {
    return this.repository
      .createQueryBuilder("job")
      .where("job.country = :country", { country: "za" })
      .andWhere("job.delisted IS NOT TRUE")
      .orderBy("job.postedAt", "DESC", "NULLS LAST")
      .take(limit)
      .getMany();
  }

  salaryBenchmarks(sourceIds: number[]): Promise<
    Array<{
      category: string;
      avgSalary: string | null;
      minSalary: string | null;
      maxSalary: string | null;
      sampleSize: string;
    }>
  > {
    return this.repository
      .createQueryBuilder("job")
      .select("job.category", "category")
      .addSelect(
        "AVG((COALESCE(job.salary_min, 0) + COALESCE(job.salary_max, 0)) / 2)",
        "avgSalary",
      )
      .addSelect("MIN(job.salary_min)", "minSalary")
      .addSelect("MAX(job.salary_max)", "maxSalary")
      .addSelect("COUNT(*)", "sampleSize")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.salary_min IS NOT NULL OR job.salary_max IS NOT NULL")
      .andWhere("job.category IS NOT NULL")
      .groupBy("job.category")
      .orderBy('"sampleSize"', "DESC")
      .limit(10)
      .getRawMany();
  }

  demandCounts(
    sourceIds: number[],
    start: Date,
    end: Date | null,
  ): Promise<Array<{ category: string; count: string }>> {
    const qb = this.repository
      .createQueryBuilder("job")
      .select("job.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.category IS NOT NULL")
      .groupBy("job.category");
    if (end) {
      qb.andWhere("job.created_at >= :start AND job.created_at < :end", { start, end });
    } else {
      qb.andWhere("job.created_at >= :start", { start });
    }
    return qb.getRawMany();
  }

  locationDemand(
    sourceIds: number[],
  ): Promise<Array<{ location: string; jobCount: string; avgSalary: string | null }>> {
    return this.repository
      .createQueryBuilder("job")
      .select("job.location_area", "location")
      .addSelect("COUNT(*)", "jobCount")
      .addSelect(
        "AVG((COALESCE(job.salary_min, 0) + COALESCE(job.salary_max, 0)) / 2)",
        "avgSalary",
      )
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.location_area IS NOT NULL")
      .groupBy("job.location_area")
      .orderBy('"jobCount"', "DESC")
      .limit(10)
      .getRawMany();
  }

  topExtractedSkillRows(sourceIds: number[]): Promise<Array<{ skills: unknown }>> {
    return this.repository
      .createQueryBuilder("job")
      .select("job.extracted_skills", "skills")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("jsonb_array_length(job.extracted_skills) > 0")
      .orderBy("job.createdAt", "DESC")
      .limit(500)
      .getRawMany();
  }

  activeJobCount(sourceIds: number[]): Promise<number> {
    return this.repository
      .createQueryBuilder("job")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .getCount();
  }

  marketByCategory(companyId: number): Promise<MarketCategoryRow[]> {
    return this.repository
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.category IS NOT NULL")
      .select("ej.category", "category")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("ej.category")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();
  }

  marketByLocation(companyId: number): Promise<MarketLocationRow[]> {
    return this.repository
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.locationArea IS NOT NULL")
      .select("ej.location_area", "location")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("ej.location_area")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();
  }

  marketSalaryByCategory(companyId: number): Promise<MarketSalaryRow[]> {
    return this.repository
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.category IS NOT NULL")
      .andWhere("ej.salaryMin IS NOT NULL")
      .select("ej.category", "category")
      .addSelect("ROUND(AVG(ej.salary_min)::numeric, 2)", "averageSalaryMin")
      .addSelect("ROUND(AVG(ej.salary_max)::numeric, 2)", "averageSalaryMax")
      .groupBy("ej.category")
      .orderBy('"averageSalaryMin"', "DESC")
      .limit(10)
      .getRawMany();
  }

  marketMonthlyJobs(companyId: number, since: Date): Promise<MonthlyJobRow[]> {
    return this.repository
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.postedAt >= :twelveMonthsAgo", { twelveMonthsAgo: since })
      .andWhere("ej.postedAt IS NOT NULL")
      .select("TO_CHAR(ej.posted_at, 'YYYY-MM')", "month")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("TO_CHAR(ej.posted_at, 'YYYY-MM')")
      .orderBy("month", "ASC")
      .getRawMany();
  }

  marketJobsWithSkills(companyId: number): Promise<ExternalJob[]> {
    return this.repository
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.extractedSkills != '[]'::jsonb")
      .select("ej.extractedSkills")
      .getMany();
  }

  async findPendingCanonicalCategory(limit: number): Promise<PendingCategoryJob[]> {
    const jobs = await this.repository.find({
      where: { canonicalCategory: IsNull() },
      select: ["id", "title", "category", "description"],
      take: limit,
      order: { id: "DESC" },
    });
    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      category: job.category,
      description: job.description,
    }));
  }

  async updateCanonicalCategory(id: number, canonicalCategory: string | null): Promise<void> {
    await this.repository.update(id, { canonicalCategory });
  }

  findByIds(ids: number[]): Promise<ExternalJob[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({ where: { id: In(ids) } });
  }

  async perSourceJobCounts(sourceIds: number[]): Promise<PerSourceJobCount[]> {
    if (sourceIds.length === 0) return [];
    const rows = await this.repository
      .createQueryBuilder("job")
      .select("job.source_id", "sourceId")
      .addSelect("COUNT(*)", "count")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .groupBy("job.source_id")
      .getRawMany();
    return rows.map((row: { sourceId: number; count: string }) => ({
      sourceId: Number(row.sourceId),
      count: Number(row.count),
    }));
  }

  async findDuplicateJobPairs(limit: number): Promise<DuplicateJobPair[]> {
    const rows = await this.repository.query(
      `
      SELECT
        a.id AS a_id, a.title AS a_title, a.company AS a_company,
        a.location_raw AS a_location, sa.name AS a_source, a.created_at AS a_created,
        b.id AS b_id, b.title AS b_title, b.company AS b_company,
        b.location_raw AS b_location, sb.name AS b_source, b.created_at AS b_created,
        ROUND(similarity(LOWER(a.title), LOWER(b.title))::numeric, 2) AS score
      FROM cv_assistant_external_jobs a
      JOIN cv_assistant_external_jobs b
        ON a.id < b.id
        AND a.country = b.country
        AND a.location_area IS NOT NULL AND b.location_area IS NOT NULL
        AND LOWER(a.location_area) = LOWER(b.location_area)
        AND similarity(LOWER(a.title), LOWER(b.title)) > 0.6
      JOIN cv_assistant_job_market_sources sa ON sa.id = a.source_id
      JOIN cv_assistant_job_market_sources sb ON sb.id = b.source_id
      ORDER BY score DESC, a.id
      LIMIT $1
      `,
      [limit],
    );

    return rows.map(
      (row: Record<string, unknown>): DuplicateJobPair => ({
        score: Number(row.score ?? 0),
        crossSource: row.a_source !== row.b_source,
        a: {
          id: Number(row.a_id),
          title: String(row.a_title ?? ""),
          company: (row.a_company as string | null) ?? null,
          location: (row.a_location as string | null) ?? null,
          source: String(row.a_source ?? ""),
          createdAt: row.a_created ? DateTime.fromJSDate(row.a_created as Date).toISO() : null,
        },
        b: {
          id: Number(row.b_id),
          title: String(row.b_title ?? ""),
          company: (row.b_company as string | null) ?? null,
          location: (row.b_location as string | null) ?? null,
          source: String(row.b_source ?? ""),
          createdAt: row.b_created ? DateTime.fromJSDate(row.b_created as Date).toISO() : null,
        },
      }),
    );
  }

  async dedupCandidateRows(): Promise<DedupCandidateRow[]> {
    const rows = await this.repository.query(`
      SELECT j.id AS id, LOWER(j.title) AS t, LOWER(j.location_area) AS loc,
             LOWER(COALESCE(j.company, '')) AS comp, s.provider AS provider,
             LENGTH(COALESCE(j.description, '')) AS desc_len, j.created_at AS created
      FROM cv_assistant_external_jobs j
      JOIN cv_assistant_job_market_sources s ON s.id = j.source_id
      WHERE j.location_area IS NOT NULL AND j.location_area <> ''
    `);
    return rows.map(
      (row: Record<string, unknown>): DedupCandidateRow => ({
        id: Number(row.id),
        title: String(row.t ?? ""),
        locationArea: String(row.loc ?? ""),
        company: String(row.comp ?? ""),
        provider: String(row.provider ?? ""),
        descriptionLength: Number(row.desc_len ?? 0),
        createdAt: (row.created as Date | null) ?? null,
      }),
    );
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repository.delete(ids);
  }

  async idsLastSeenBefore(cutoff: Date): Promise<number[]> {
    const rows = await this.repository.find({
      where: { lastSeenAt: LessThan(cutoff) },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async stampLastSeenByExternalIds(
    sourceId: number,
    externalIds: string[],
    seenAt: Date,
  ): Promise<void> {
    if (externalIds.length === 0) return;
    await this.repository.update(
      { sourceId, sourceExternalId: In(externalIds) },
      { lastSeenAt: seenAt },
    );
  }

  async stampLastSeenByIds(ids: number[], seenAt: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.repository.update({ id: In(ids) }, { lastSeenAt: seenAt });
  }

  async expireStaleJobs(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ expiresAt: () => "now()" })
      .where("(expires_at IS NULL OR expires_at > now())")
      .andWhere("last_seen_at IS NOT NULL")
      .andWhere("last_seen_at < now() - INTERVAL '14 days'")
      .execute();
    return result.affected ?? 0;
  }

  async reportDelist(id: number, reportedBy: string | null, reportedAt: Date): Promise<void> {
    await this.repository.update(id, {
      delistReview: "pending",
      delistReportedAt: reportedAt,
      delistReportedBy: reportedBy,
    });
  }

  async confirmDelist(id: number, delistedAt: Date): Promise<void> {
    await this.repository.update(id, { delisted: true, delistReview: "confirmed", delistedAt });
  }

  async rejectDelist(id: number): Promise<void> {
    await this.repository.update(id, { delisted: false, delistReview: "rejected" });
  }

  async pendingDelistReports(): Promise<DelistReportRow[]> {
    const jobs = await this.repository
      .createQueryBuilder("job")
      .leftJoinAndSelect("job.source", "source")
      .where("job.delist_review = :status", { status: "pending" })
      .orderBy("job.delistReportedAt", "DESC", "NULLS LAST")
      .getMany();
    return jobs.map((job) => {
      const source = job.source as { provider?: string } | null | undefined;
      const sourceProvider = source ? (source.provider ?? null) : null;
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        locationRaw: job.locationRaw,
        locationArea: job.locationArea,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        sourceUrl: job.sourceUrl,
        sourceProvider,
        delistReportedAt: job.delistReportedAt,
        delistReportedBy: job.delistReportedBy,
      };
    });
  }

  countPendingDelistReports(): Promise<number> {
    return this.repository
      .createQueryBuilder("job")
      .where("job.delist_review = :status", { status: "pending" })
      .getCount();
  }
}
