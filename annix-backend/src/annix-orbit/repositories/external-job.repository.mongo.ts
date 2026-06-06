import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
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

const EXTERNAL_JOB_RETENTION_CAP = 15000;

@Injectable()
export class MongoExternalJobRepository
  extends MongoCrudRepository<ExternalJob>
  implements ExternalJobRepository
{
  constructor(@InjectModel("ExternalJob", ORBIT_CONNECTION) model: Model<ExternalJob>) {
    super(model);
  }

  async findByIdWithSource(id: number): Promise<ExternalJob | null> {
    const doc = await this.documents.findById(id).populate("source").lean().exec();
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
      filter.$or = [
        { title: { $regex: options.search, $options: "i" } },
        { company: { $regex: options.search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ postedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    return { jobs: this.toDomainList(docs), total };
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
      filter.$or = [
        { title: { $regex: options.search, $options: "i" } },
        { company: { $regex: options.search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ postedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    return { jobs: this.toDomainList(docs), total };
  }

  async jobsWithEmbedding(
    categoryPool: string[] | null,
    countries: string[] | null = null,
  ): Promise<ExternalJob[]> {
    const filter: Record<string, unknown> = { embedding: { $ne: null } };
    if (categoryPool !== null && categoryPool.length > 0) {
      filter.canonicalCategory = { $in: categoryPool };
    }
    if (countries !== null && countries.length > 0) {
      filter.country = { $in: countries };
    }
    const docs = await this.documents.find(filter).lean().exec();
    return this.toDomainList(docs);
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

  async publicExternalJobs(options: ExternalJobListOptions): Promise<ExternalJob[]> {
    const filter: Record<string, unknown> = { delisted: { $ne: true } };
    if (options.country) filter.country = options.country;
    if (options.category) filter.category = options.category;
    if (options.search) {
      filter.$or = [
        { title: { $regex: options.search, $options: "i" } },
        { company: { $regex: options.search, $options: "i" } },
      ];
    }
    const docs = await this.documents
      .find(filter)
      .select({ embedding: 0 })
      .sort({ postedAt: -1 })
      .allowDiskUse(true)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByExternalIds(externalIds: string[], sourceId: number): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ sourceExternalId: { $in: externalIds }, sourceId })
      .select("sourceExternalId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async jobsMissingEmbedding(): Promise<ExternalJob[]> {
    const docs = await this.documents
      .find({ $or: [{ embedding: null }, { embedding: { $exists: false } }] })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async embeddingCoverage(): Promise<EmbeddingCoverageRow> {
    const total = await this.documents.countDocuments({}).exec();
    const embedded = await this.documents
      .countDocuments({ embedding: { $exists: true, $ne: null } })
      .exec();
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

  async setEmbeddingVector(id: number, embeddingLiteral: string): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { embedding: `[${embeddingLiteral}]` }).exec();
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
    const titleLower = title.toLowerCase();
    const candidates = await this.documents
      .find({
        country: { $regex: `^${escapeRegex(country)}$`, $options: "i" },
        sourceId: { $ne: sourceId },
        title: { $regex: escapeRegex(title), $options: "i" },
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
    const filter: Record<string, unknown> = { country: "za", delisted: { $ne: true } };
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
      .find({ country: "za", delisted: { $ne: true } })
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
    const docs = await this.documents
      .find({ locationArea: { $nin: [null, ""] } })
      .select("title locationArea company sourceId description createdAt")
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: Number(doc._id),
      title: String(doc.title ?? "").toLowerCase(),
      locationArea: String(doc.locationArea ?? "").toLowerCase(),
      company: String(doc.company ?? "").toLowerCase(),
      provider: String(providerById.get(doc.sourceId as number) ?? ""),
      descriptionLength: String(doc.description ?? "").length,
      createdAt: (doc.createdAt as Date | null) ?? null,
    }));
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
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

    const deletedExpired = await this.documents
      .deleteMany({ expiresAt: { $ne: null, $lte: now } })
      .exec();

    const trimmed = await this.trimToNewest(EXTERNAL_JOB_RETENTION_CAP);

    return (deletedExpired.deletedCount ?? 0) + trimmed;
  }

  private async trimToNewest(cap: number): Promise<number> {
    const total = await this.documents.countDocuments({});
    if (total <= cap) return 0;
    const keep = await this.documents
      .find({}, { projection: { _id: 1 } })
      .sort({ _id: -1 })
      .limit(cap)
      .lean()
      .exec();
    const keepIds = keep.map((doc) => doc._id);
    const result = await this.documents.deleteMany({ _id: { $nin: keepIds } }).exec();
    return result.deletedCount ?? 0;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
