import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { now } from "../../lib/datetime";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ExternalJob } from "../entities/external-job.entity";
import { encodeEmbedding } from "../lib/embedding-codec";
import type { EmbeddingSimilarityBatch } from "../lib/embedding-similarity";
import { CandidateJobMatch } from "../schemas/candidate-job-match.schema";
import { ExternalJobAlternate } from "../schemas/external-job-alternate.schema";
import { ExternalJobEmbedding } from "../schemas/external-job-embedding.schema";
import {
  DedupCandidateRow,
  DelistReportRow,
  DuplicateJobPair,
  EmbeddingCoverageRow,
  EmbeddingState,
  ExternalJobListOptions,
  ExternalJobRepository,
  JobEmbeddingDemandClause,
  MarketCategoryRow,
  MarketLocationRow,
  MarketSalaryRow,
  MonthlyJobRow,
  PendingCategoryJob,
  PerSourceJobCount,
  VettingUpdate,
} from "./external-job.repository";

export const DEFAULT_EXTERNAL_JOB_RETENTION_CAP = 15000;
const SEARCH_TERM_MAX_LENGTH = 100;

@Injectable()
export class MongoExternalJobRepository
  extends MongoCrudRepository<ExternalJob>
  implements ExternalJobRepository
{
  private readonly logger = new Logger(MongoExternalJobRepository.name);
  private emptyCoverageWarned = false;

  constructor(
    @InjectModel("ExternalJob", ORBIT_CONNECTION) model: Model<ExternalJob>,
    @InjectModel("ExternalJobEmbedding", ORBIT_CONNECTION)
    private readonly embeddingDocuments: Model<ExternalJobEmbedding>,
    @InjectModel("CandidateJobMatch", ORBIT_CONNECTION)
    private readonly matchDocuments: Model<CandidateJobMatch>,
    @InjectModel("ExternalJobAlternate", ORBIT_CONNECTION)
    private readonly alternateDocuments: Model<ExternalJobAlternate>,
  ) {
    super(model);
  }

  private async deleteSiblings(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.embeddingDocuments.deleteMany({ _id: { $in: ids } }).exec();
    await this.matchDocuments.deleteMany({ externalJobId: { $in: ids } }).exec();
    await this.alternateDocuments.deleteMany({ canonicalExternalJobId: { $in: ids } }).exec();
  }

  async findByIdWithSource(id: number): Promise<ExternalJob | null> {
    const doc = await this.documents
      .findById(id)
      .select("-embedding")
      .populate("source")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  private async sourceIdsForCompany(companyId: number): Promise<number[]> {
    const sourceModel = this.model.db.model<Record<string, unknown>>("JobMarketSource");
    const sources = await sourceModel.find({ companyId }).select("_id").lean().exec();
    return sources.map((s) => s._id as number);
  }

  private async platformGlobalSourceIds(): Promise<number[]> {
    const sourceModel = this.model.db.model<Record<string, unknown>>("JobMarketSource");
    const sources = await sourceModel
      .find({ $or: [{ companyId: null }, { companyId: { $exists: false } }] })
      .select("_id")
      .lean()
      .exec();
    return sources.map((s) => s._id as number);
  }

  async externalJobsForCompany(
    companyId: number,
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const sourceIds = await this.sourceIdsForCompany(companyId);

    const filter: Record<string, unknown> = { sourceId: { $in: sourceIds } };
    if (options.country) filter.country = options.country;
    if (options.category) filter.category = options.category;
    if (options.search) {
      const clauses = searchTermClauses(options.search);
      if (clauses) filter.$or = clauses;
    }

    const { items, total } = await this.findPage(
      {},
      { page, limit, filter, excludeFields: ["embedding"], sort: { postedAt: "DESC" } },
    );
    return { jobs: items, total };
  }

  async platformGlobalExternalJobs(
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const sourceIds = await this.platformGlobalSourceIds();

    const filter: Record<string, unknown> = {
      sourceId: { $in: sourceIds },
      delisted: { $ne: true },
      $and: [
        { $or: [{ acceptsZa: null }, { acceptsZa: true }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      ],
    };
    if (options.country) filter.country = options.country;
    if (options.category) filter.category = options.category;
    if (options.search) {
      const clauses = searchTermClauses(options.search);
      if (clauses) filter.$or = clauses;
    }

    const { items, total } = await this.findPage(
      {},
      { page, limit, filter, excludeFields: ["embedding"], sort: { postedAt: "DESC" } },
    );
    return { jobs: items, total };
  }

  async *jobEmbeddingBatches(
    categoryPool: string[] | null,
    countries: string[] | null = null,
    batchSize: number,
  ): AsyncGenerator<EmbeddingSimilarityBatch> {
    const hasCategory = categoryPool !== null && categoryPool.length > 0;
    const hasCountries = countries !== null && countries.length > 0;
    const unfiltered = !hasCategory && !hasCountries;

    // Perf #396 finding 5: the filtered branch streams the matching jobs and
    // their embedding via a single aggregation join, instead of materialising
    // every eligible job _id into one array and feeding it to an unbounded `$in`.
    // The category + country match runs against the jobs collection (where those
    // fields live), the `$lookup` pulls the sibling embedding, and `$match` keeps
    // only jobs that actually have one — the identical result set + `_id`
    // ordering as the old find({ _id: { $in: [...] } }).sort({ _id: 1 }).
    const cursor = unfiltered
      ? this.embeddingDocuments
          .find({})
          .select({ _id: 1, embedding: 1 })
          .sort({ _id: 1 })
          .lean()
          .cursor()
      : this.documents
          .aggregate<{ _id: number; embedding: Buffer | null }>([
            { $match: this.embeddingFilter(categoryPool, countries) },
            { $sort: { _id: 1 } },
            {
              $lookup: {
                from: "cv_assistant_external_job_embeddings",
                localField: "_id",
                foreignField: "_id",
                as: "embeddingDoc",
              },
            },
            { $match: { "embeddingDoc.0": { $exists: true } } },
            {
              $project: {
                _id: 1,
                embedding: { $arrayElemAt: ["$embeddingDoc.embedding", 0] },
              },
            },
          ])
          .allowDiskUse(true)
          .cursor();

    let yielded = 0;
    let batch: EmbeddingSimilarityBatch = [];
    for await (const doc of cursor) {
      batch.push({ id: Number(doc._id), embedding: doc.embedding ?? null });
      yielded += 1;
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length > 0) {
      yield batch;
    }

    if (unfiltered && yielded === 0) {
      await this.warnOnEmptyEmbeddingCoverage();
    }
  }

  private async warnOnEmptyEmbeddingCoverage(): Promise<void> {
    if (this.emptyCoverageWarned) return;
    const jobCount = await this.documents.countDocuments({}).exec();
    if (jobCount > 0) {
      this.emptyCoverageWarned = true;
      this.logger.warn(
        `Embedding coverage collapse: ${jobCount} external jobs exist but the embeddings collection is empty — matching will return zero matches until the embedding backfill runs.`,
      );
    }
  }

  private async embeddedJobIds(): Promise<number[]> {
    const rows = await this.embeddingDocuments.find({}).select({ _id: 1 }).lean().exec();
    return rows.map((row) => Number(row._id));
  }

  private embeddingFilter(
    categoryPool: string[] | null,
    countries: string[] | null = null,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (categoryPool !== null && categoryPool.length > 0) {
      filter.canonicalCategory = { $in: categoryPool };
    }
    if (countries !== null && countries.length > 0) {
      filter.country = { $in: countries };
    }
    return filter;
  }

  async findPendingVetting(limit: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ $or: [{ acceptsZa: null }, { acceptsZa: { $exists: false } }] })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateVetting(id: number, update: VettingUpdate): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, {
        acceptsZa: update.acceptsZa,
        vettingNotes: update.vettingNotes,
        vettedAt: update.vettedAt,
      })
      .exec();
  }

  async publicExternalJobs(
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const filter: Record<string, unknown> = {
      delisted: { $ne: true },
      delistReview: { $ne: "pending" },
    };
    if (options.country) filter.country = options.country;
    if (options.category) filter.category = options.category;
    if (options.search) {
      const clauses = searchTermClauses(options.search);
      if (clauses) filter.$or = clauses;
    }
    const { items, total } = await this.findPage(
      {},
      { page, limit, filter, excludeFields: ["embedding"], sort: { postedAt: "DESC" } },
    );
    return { jobs: items, total };
  }

  async findByExternalIds(externalIds: string[], sourceId: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ sourceExternalId: { $in: externalIds }, sourceId })
      .select("sourceExternalId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async jobsMissingEmbedding(
    limit: number,
    demand: JobEmbeddingDemandClause[] | null = null,
  ): Promise<ExternalJob[]> {
    // Demand-aware (C1): an empty clause list means NO active candidate targets
    // anything, so nothing needs embedding — never embed the whole pool. A null
    // demand (legacy/bulk callers) keeps the original "embed everything missing"
    // behaviour. Otherwise restrict to jobs whose category+country matches the
    // matcher's eligibility granularity.
    if (demand !== null && demand.length === 0) {
      return [];
    }
    const embeddedIds = await this.embeddedJobIds();
    const filter: Record<string, unknown> = { _id: { $nin: embeddedIds } };
    if (demand !== null) {
      filter.$or = demandClauses(demand);
    }
    const docs = await this.documents.find(filter).limit(limit).lean().exec();
    return this.toDomainList(docs);
  }

  async jobEmbedding(id: number): Promise<Buffer | null> {
    const doc = await this.embeddingDocuments.findById(id).select({ embedding: 1 }).lean().exec();
    return doc?.embedding ?? null;
  }

  async jobEmbeddingState(id: number): Promise<EmbeddingState> {
    const doc = await this.embeddingDocuments
      .findById(id)
      .select({ embedding: 1, embeddingTextHash: 1 })
      .lean()
      .exec();
    return {
      hasEmbedding: doc?.embedding != null,
      textHash: doc?.embeddingTextHash ?? null,
    };
  }

  async jobEmbeddings(ids: number[]): Promise<Map<number, Buffer>> {
    if (ids.length === 0) return new Map();
    const docs = await this.embeddingDocuments
      .find({ _id: { $in: ids } })
      .select({ _id: 1, embedding: 1 })
      .lean()
      .exec();
    return new Map(
      docs
        .filter((doc) => doc.embedding != null)
        .map((doc) => [Number(doc._id), doc.embedding as Buffer]),
    );
  }

  async embeddingCoverage(): Promise<EmbeddingCoverageRow> {
    const total = await this.documents.countDocuments({}).exec();
    const embedded = await this.embeddingDocuments.countDocuments({}).exec();
    return { total, embedded };
  }

  async canonicalCategoryCoverage(): Promise<{ total: number; classified: number }> {
    const total = await this.documents.countDocuments({}).exec();
    const classified = await this.documents
      .countDocuments({ canonicalCategory: { $exists: true, $nin: [null, ""] } })
      .exec();
    return { total, classified };
  }

  countForSourceSince(sourceId: number, since: Date): Promise<number> {
    return this.documents.countDocuments({ sourceId, createdAt: { $gt: since } }).exec();
  }

  countForSources(sourceIds: number[]): Promise<number> {
    if (sourceIds.length === 0) return Promise.resolve(0);
    return this.documents.countDocuments({ sourceId: { $in: sourceIds } }).exec();
  }

  countForSourcesSince(sourceIds: number[], since: Date): Promise<number> {
    if (sourceIds.length === 0) return Promise.resolve(0);
    return this.documents
      .countDocuments({ sourceId: { $in: sourceIds }, createdAt: { $gte: since } })
      .exec();
  }

  async setEmbeddingVector(id: number, values: number[], textHash: string): Promise<void> {
    await this.embeddingDocuments
      .updateOne(
        { _id: id },
        {
          $set: {
            embedding: encodeEmbedding(values),
            embeddingTextHash: textHash,
            updatedAt: now().toJSDate(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async updateLocation(id: number, lat: number, lon: number): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { locationLat: lat, locationLon: lon }).exec();
  }

  async findDuplicateCanonicalJob(
    title: string,
    sourceId: number,
    country: string,
    normalisedLocation: string,
    normalisedCompany: string,
  ): Promise<ExternalJob | null> {
    const titleKey = normaliseTitleKey(title);
    if (titleKey === "") {
      return null;
    }
    const titleLower = title.toLowerCase();
    const candidates = await this.documents
      .find({
        country: country.toLowerCase(),
        titleKey,
        sourceId: { $ne: sourceId },
      })
      .lean()
      .exec();
    const match = candidates.find((doc) => {
      const docTitle = String(doc.title ?? "").toLowerCase();
      if (!docTitle.includes(titleLower) && !titleLower.includes(docTitle)) {
        return false;
      }
      const docLocation = String(doc.locationArea ?? "").toLowerCase();
      const docCompany = String(doc.company ?? "").toLowerCase();
      const locationMatches = normalisedLocation === "" || docLocation === normalisedLocation;
      const companyMatches = normalisedCompany === "" || docCompany.includes(normalisedCompany);
      return locationMatches || companyMatches;
    });
    return this.toDomain(match ?? null);
  }

  async coldStartJobs(locationTokens: string[], limit: number): Promise<ExternalJob[]> {
    const filter: Record<string, unknown> = {
      country: "za",
      delisted: { $ne: true },
      delistReview: { $ne: "pending" },
    };
    if (locationTokens.length > 0) {
      filter.$or = locationTokens.map((token) => ({
        locationRaw: { $regex: escapeRegex(token), $options: "i" },
      }));
    }
    const docs = await this.documents
      .find(filter)
      .sort({ postedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async coldStartFallbackJobs(limit: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ country: "za", delisted: { $ne: true }, delistReview: { $ne: "pending" } })
      .sort({ postedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async salaryBenchmarks(sourceIds: number[]): Promise<
    Array<{
      category: string;
      avgSalary: string | null;
      minSalary: string | null;
      maxSalary: string | null;
      sampleSize: string;
    }>
  > {
    const rows = await this.documents
      .aggregate([
        {
          $match: {
            sourceId: { $in: sourceIds },
            category: { $ne: null },
            $or: [{ salaryMin: { $ne: null } }, { salaryMax: { $ne: null } }],
          },
        },
        {
          $group: {
            _id: "$category",
            avgSalary: {
              $avg: {
                $divide: [
                  {
                    $add: [{ $ifNull: ["$salaryMin", 0] }, { $ifNull: ["$salaryMax", 0] }],
                  },
                  2,
                ],
              },
            },
            minSalary: { $min: "$salaryMin" },
            maxSalary: { $max: "$salaryMax" },
            sampleSize: { $sum: 1 },
          },
        },
        { $sort: { sampleSize: -1 } },
        { $limit: 10 },
      ])
      .exec();
    return rows.map((r) => ({
      category: r._id,
      avgSalary: r.avgSalary != null ? String(r.avgSalary) : null,
      minSalary: r.minSalary != null ? String(r.minSalary) : null,
      maxSalary: r.maxSalary != null ? String(r.maxSalary) : null,
      sampleSize: String(r.sampleSize),
    }));
  }

  async demandCounts(
    sourceIds: number[],
    start: Date,
    end: Date | null,
  ): Promise<Array<{ category: string; count: string }>> {
    const createdAt: Record<string, Date> = { $gte: start };
    if (end) createdAt.$lt = end;
    const rows = await this.documents
      .aggregate([
        { $match: { sourceId: { $in: sourceIds }, category: { $ne: null }, createdAt } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .exec();
    return rows.map((r) => ({ category: r._id, count: String(r.count) }));
  }

  async locationDemand(
    sourceIds: number[],
  ): Promise<Array<{ location: string; jobCount: string; avgSalary: string | null }>> {
    const rows = await this.documents
      .aggregate([
        { $match: { sourceId: { $in: sourceIds }, locationArea: { $ne: null } } },
        {
          $group: {
            _id: "$locationArea",
            jobCount: { $sum: 1 },
            avgSalary: {
              $avg: {
                $divide: [
                  {
                    $add: [{ $ifNull: ["$salaryMin", 0] }, { $ifNull: ["$salaryMax", 0] }],
                  },
                  2,
                ],
              },
            },
          },
        },
        { $sort: { jobCount: -1 } },
        { $limit: 10 },
      ])
      .exec();
    return rows.map((r) => ({
      location: r._id,
      jobCount: String(r.jobCount),
      avgSalary: r.avgSalary != null ? String(r.avgSalary) : null,
    }));
  }

  async topExtractedSkillRows(sourceIds: number[]): Promise<Array<{ skills: unknown }>> {
    const docs = await this.documents
      .find({
        sourceId: { $in: sourceIds },
        "extractedSkills.0": { $exists: true },
      })
      .select("extractedSkills")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();
    return docs.map((doc) => ({ skills: doc.extractedSkills }));
  }

  activeJobCount(sourceIds: number[]): Promise<number> {
    return this.documents
      .countDocuments({
        sourceId: { $in: sourceIds },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
      .exec();
  }

  async marketByCategory(companyId: number): Promise<MarketCategoryRow[]> {
    const sourceIds = await this.sourceIdsForCompany(companyId);
    const rows = await this.documents
      .aggregate([
        { $match: { sourceId: { $in: sourceIds }, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .exec();
    return rows.map((r) => ({ category: r._id, count: Number(r.count) }));
  }

  async marketByLocation(companyId: number): Promise<MarketLocationRow[]> {
    const sourceIds = await this.sourceIdsForCompany(companyId);
    const rows = await this.documents
      .aggregate([
        { $match: { sourceId: { $in: sourceIds }, locationArea: { $ne: null } } },
        { $group: { _id: "$locationArea", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .exec();
    return rows.map((r) => ({ location: r._id, count: Number(r.count) }));
  }

  async marketSalaryByCategory(companyId: number): Promise<MarketSalaryRow[]> {
    const sourceIds = await this.sourceIdsForCompany(companyId);
    const rows = await this.documents
      .aggregate([
        {
          $match: {
            sourceId: { $in: sourceIds },
            category: { $ne: null },
            salaryMin: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$category",
            averageSalaryMin: { $avg: "$salaryMin" },
            averageSalaryMax: { $avg: "$salaryMax" },
          },
        },
        { $sort: { averageSalaryMin: -1 } },
        { $limit: 10 },
      ])
      .exec();
    return rows.map((r) => ({
      category: r._id,
      averageSalaryMin: Math.round(Number(r.averageSalaryMin) * 100) / 100,
      averageSalaryMax: Math.round(Number(r.averageSalaryMax) * 100) / 100,
    }));
  }

  async marketMonthlyJobs(companyId: number, since: Date): Promise<MonthlyJobRow[]> {
    const sourceIds = await this.sourceIdsForCompany(companyId);
    const rows = await this.documents
      .aggregate([
        {
          $match: {
            sourceId: { $in: sourceIds },
            postedAt: { $gte: since, $ne: null },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$postedAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({ month: r._id, count: Number(r.count) }));
  }

  async marketJobsWithSkills(companyId: number): Promise<ExternalJob[]> {
    const sourceIds = await this.sourceIdsForCompany(companyId);
    const docs = await this.documents
      .find({ sourceId: { $in: sourceIds }, "extractedSkills.0": { $exists: true } })
      .select("extractedSkills")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingCanonicalCategory(limit: number): Promise<PendingCategoryJob[]> {
    const docs = await this.documents
      .find({ $or: [{ canonicalCategory: null }, { canonicalCategory: { $exists: false } }] })
      .select("title category description")
      .sort({ _id: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: Number(doc._id),
      title: String(doc.title ?? ""),
      category: (doc.category as string | null) ?? null,
      description: (doc.description as string | null) ?? null,
    }));
  }

  async updateCanonicalCategory(id: number, canonicalCategory: string | null): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { canonicalCategory }).exec();
  }

  async updateExtractedSkills(id: number, skills: string[]): Promise<void> {
    // Stamp skillsAnalyzedAt even when skills is empty, so empty-shell jobs (no
    // extractable skills) aren't re-analysed forever.
    await this.documents
      .findByIdAndUpdate(id, { extractedSkills: skills, skillsAnalyzedAt: now().toJSDate() })
      .exec();
  }

  async jobsMissingSkills(limit: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ $or: [{ skillsAnalyzedAt: null }, { skillsAnalyzedAt: { $exists: false } }] })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async jobsMissingCoords(limit: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({
        $and: [
          { $or: [{ geocodeAttemptedAt: null }, { geocodeAttemptedAt: { $exists: false } }] },
          {
            $or: [{ locationRaw: { $nin: [null, ""] } }, { locationArea: { $nin: [null, ""] } }],
          },
        ],
      })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markJobGeocoded(id: number, lat: number | null, lon: number | null): Promise<void> {
    // Stamp geocodeAttemptedAt even on a miss, so ungeocodable addresses aren't
    // re-sent to the paid geocode API. Only write coords when we got them.
    const update: Record<string, unknown> = { geocodeAttemptedAt: now().toJSDate() };
    if (lat !== null && lon !== null) {
      update.locationLat = lat;
      update.locationLon = lon;
    }
    await this.documents.findByIdAndUpdate(id, update).exec();
  }

  async findByIds(ids: number[]): Promise<ExternalJob[]> {
    if (ids.length === 0) return [];
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async perSourceJobCounts(sourceIds: number[]): Promise<PerSourceJobCount[]> {
    if (sourceIds.length === 0) return [];
    const rows = await this.documents
      .aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: "$sourceId", count: { $sum: 1 } } },
      ])
      .exec();
    return rows.map((row) => ({ sourceId: Number(row._id), count: Number(row.count) }));
  }

  findDuplicateJobPairs(_limit: number): Promise<DuplicateJobPair[]> {
    throw new NotImplementedException(
      "findDuplicateJobPairs requires pg_trgm similarity and is not available on the Mongo-driver build",
    );
  }

  async dedupCandidateRows(): Promise<DedupCandidateRow[]> {
    const sourceModel = this.model.db.model<Record<string, unknown>>("JobMarketSource");
    const sources = await sourceModel.find().select("provider").lean().exec();
    const providerById = new Map(sources.map((source) => [source._id as number, source.provider]));

    const buckets = await this.documents
      .aggregate<{
        _id: { title: string; locationArea: string };
        docs: Array<{
          _id: number;
          company: unknown;
          sourceId: unknown;
          descriptionLength: number;
          createdAt: Date | null;
        }>;
      }>([
        { $match: { locationArea: { $nin: [null, ""] } } },
        {
          $group: {
            _id: {
              title: { $toLower: { $ifNull: ["$title", ""] } },
              locationArea: { $toLower: { $ifNull: ["$locationArea", ""] } },
            },
            docs: {
              $push: {
                _id: "$_id",
                company: "$company",
                sourceId: "$sourceId",
                descriptionLength: { $strLenCP: { $ifNull: ["$description", ""] } },
                createdAt: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .allowDiskUse(true)
      .exec();

    return buckets.flatMap((bucket) =>
      bucket.docs.map((doc) => ({
        id: Number(doc._id),
        title: bucket._id.title,
        locationArea: bucket._id.locationArea,
        company: String(doc.company ?? "").toLowerCase(),
        provider: String(providerById.get(doc.sourceId as number) ?? ""),
        descriptionLength: doc.descriptionLength,
        createdAt: doc.createdAt ?? null,
      })),
    );
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
    await this.deleteSiblings([id]);
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
    await this.deleteSiblings(ids);
  }

  async idsLastSeenBefore(cutoff: Date): Promise<number[]> {
    const rows = await this.documents
      .find({ lastSeenAt: { $ne: null, $lt: cutoff } })
      .select({ _id: 1 })
      .lean()
      .exec();
    return rows.map((row) => row._id as number);
  }

  async stampLastSeenByExternalIds(
    sourceId: number,
    externalIds: string[],
    seenAt: Date,
  ): Promise<void> {
    if (externalIds.length === 0) return;
    await this.documents
      .updateMany(
        { sourceId, sourceExternalId: { $in: externalIds } },
        { $set: { lastSeenAt: seenAt } },
      )
      .exec();
  }

  async stampLastSeenByIds(ids: number[], seenAt: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.documents.updateMany({ _id: { $in: ids } }, { $set: { lastSeenAt: seenAt } }).exec();
  }

  async expireStaleJobs(): Promise<number> {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    await this.documents
      .updateMany(
        {
          $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
          lastSeenAt: { $ne: null, $lt: staleCutoff },
        },
        { $set: { expiresAt: now } },
      )
      .exec();

    const expiredIds = (
      await this.documents
        .find({ expiresAt: { $ne: null, $lte: now } })
        .select({ _id: 1 })
        .lean()
        .exec()
    ).map((doc) => doc._id as number);
    const deletedExpired = await this.documents.deleteMany({ _id: { $in: expiredIds } }).exec();
    await this.deleteSiblings(expiredIds);

    // The retention cap is enforced once per cycle by enforceRetentionCap (the
    // interim per-source guard plus the end-of-cycle backstop). The stale sweep
    // no longer runs a second, different cap-trim here.
    return deletedExpired.deletedCount ?? 0;
  }

  // Hard-enforce the retention cap right after ingestion (manual or scheduled),
  // independent of the stale-sweep cron — so the job pool never sits above the
  // cap. Deletes only the overage (the oldest by lastSeenAt), which is cheap
  // versus re-trimming the whole collection.
  async enforceRetentionCap(): Promise<number> {
    const cap = await this.configuredRetentionCap();
    const total = await this.documents.countDocuments({});
    const overage = total - cap;
    if (overage <= 0) return 0;
    const oldest = await this.documents
      .find({}, { projection: { _id: 1 } })
      .sort({ lastSeenAt: 1, _id: 1 })
      .limit(overage)
      .allowDiskUse(true)
      .lean()
      .exec();
    const ids = oldest.map((doc) => doc._id as number);
    if (ids.length === 0) return 0;
    const result = await this.documents.deleteMany({ _id: { $in: ids } }).exec();
    await this.deleteSiblings(ids);
    return result.deletedCount ?? 0;
  }

  // The retention cap is admin-configurable per environment (stored in this
  // env's Orbit DB by the job-market admin page); falls back to the default.
  private async configuredRetentionCap(): Promise<number> {
    const nativeDb = this.model.db.db;
    if (!nativeDb) return DEFAULT_EXTERNAL_JOB_RETENTION_CAP;
    const doc = await nativeDb
      .collection<{ _id: string; externalJobRetentionCap?: number }>("cv_assistant_orbit_settings")
      .findOne({ _id: "default" });
    return sanitiseRetentionCap(doc?.externalJobRetentionCap);
  }

  async reportDelist(id: number, reportedBy: string | null, reportedAt: Date): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, {
        $set: {
          delistReview: "pending",
          delistReportedAt: reportedAt,
          delistReportedBy: reportedBy,
        },
      })
      .exec();
  }

  async confirmDelist(id: number, delistedAt: Date): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, {
        $set: { delisted: true, delistReview: "confirmed", delistedAt },
      })
      .exec();
  }

  async rejectDelist(id: number): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, {
        $set: { delisted: false, delistReview: "rejected" },
      })
      .exec();
  }

  async pendingDelistReports(): Promise<DelistReportRow[]> {
    const docs = await this.documents
      .find({ delistReview: "pending" })
      .sort({ delistReportedAt: -1 })
      .populate("source")
      .lean()
      .exec();
    return docs.map((doc) => {
      const source = doc.source as { provider?: string } | null | undefined;
      const sourceProvider = source ? (source.provider ?? null) : null;
      return {
        id: Number(doc._id),
        title: String(doc.title ?? ""),
        company: (doc.company as string | null) ?? null,
        locationRaw: (doc.locationRaw as string | null) ?? null,
        locationArea: (doc.locationArea as string | null) ?? null,
        salaryMin: (doc.salaryMin as number | null) ?? null,
        salaryMax: (doc.salaryMax as number | null) ?? null,
        salaryCurrency: (doc.salaryCurrency as string | null) ?? null,
        sourceUrl: (doc.sourceUrl as string | null) ?? null,
        sourceProvider,
        delistReportedAt: (doc.delistReportedAt as Date | null) ?? null,
        delistReportedBy: (doc.delistReportedBy as string | null) ?? null,
      };
    });
  }

  countPendingDelistReports(): Promise<number> {
    return this.documents.countDocuments({ delistReview: "pending" }).exec();
  }
}

// Each clause → a Mongo sub-filter; the caller ORs them. A null `categories`
// clause is a wildcard over every category in those countries (soft-tier
// seekers); otherwise it gates canonicalCategory ∈ categories AND country ∈
// countries — the exact granularity of embeddingFilter used by the matcher.
function demandClauses(demand: JobEmbeddingDemandClause[]): Array<Record<string, unknown>> {
  return demand.map((clause) => {
    const sub: Record<string, unknown> = { country: { $in: clause.countries } };
    if (clause.categories !== null) {
      sub.canonicalCategory = { $in: clause.categories };
    }
    return sub;
  });
}

export function normaliseTitleKey(title: string | null | undefined): string {
  if (!title) return "";
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchTermClauses(search: string): Array<Record<string, unknown>> | null {
  const bounded = search.trim().slice(0, SEARCH_TERM_MAX_LENGTH);
  if (bounded === "") return null;
  const pattern = escapeRegex(bounded);
  return [
    { title: { $regex: pattern, $options: "i" } },
    { company: { $regex: pattern, $options: "i" } },
  ];
}

function sanitiseRetentionCap(cap: number | null | undefined): number {
  return typeof cap === "number" && Number.isInteger(cap) && cap >= 0
    ? cap
    : DEFAULT_EXTERNAL_JOB_RETENTION_CAP;
}
