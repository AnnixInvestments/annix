import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import type { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import type { ExternalJob } from "../entities/external-job.entity";
import {
  CandidateJobMatchRepository,
  type MatchScores,
  type RecommendedFacetRow,
  type RecommendedMatchCountFilters,
} from "./candidate-job-match.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The single source of truth for which external jobs are recommendable to a
// seeker: live (not delisted/expired) plus any active filters. Used for both the
// displayed list and the headline count so the two can never disagree.
function buildLiveJobFilter(filters: RecommendedMatchCountFilters | null): Record<string, unknown> {
  const query: Record<string, unknown> = {
    delisted: { $ne: true },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
  const and: Array<Record<string, unknown>> = [];

  if (filters?.countries && filters.countries.length > 0) {
    query.country = { $in: filters.countries };
  }
  if (filters?.category) {
    query.canonicalCategory = filters.category;
  }
  if (filters?.sourceIds && filters.sourceIds.length > 0) {
    query.sourceId = { $in: filters.sourceIds };
  }
  if (filters?.provinces && filters.provinces.length > 0) {
    query.canonicalProvince = { $in: filters.provinces };
  }
  if (filters?.cities && filters.cities.length > 0) {
    query.canonicalCity = { $in: filters.cities };
  }
  if (filters?.search) {
    const rx = new RegExp(escapeRegex(filters.search.trim()), "i");
    and.push({
      $or: [
        { title: rx },
        { company: rx },
        { locationArea: rx },
        { locationRaw: rx },
        { description: rx },
      ],
    });
  }
  if (filters?.minSalary != null && filters.minSalary > 0) {
    and.push({
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ["$salaryMax", "$salaryMin"] }, null] },
          { $gte: [{ $ifNull: ["$salaryMax", "$salaryMin"] }, filters.minSalary] },
        ],
      },
    });
  }
  if (and.length > 0) {
    query.$and = and;
  }
  return query;
}

@Injectable()
export class MongoCandidateJobMatchRepository
  extends MongoCrudRepository<CandidateJobMatch>
  implements CandidateJobMatchRepository
{
  constructor(@InjectModel("CandidateJobMatch", ORBIT_CONNECTION) model: Model<CandidateJobMatch>) {
    super(model);
  }

  async findByCandidateAndJob(
    candidateId: number,
    externalJobId: number,
  ): Promise<CandidateJobMatch | null> {
    const doc = await this.documents.findOne({ candidateId, externalJobId }).lean().exec();
    return this.toDomain(doc);
  }

  async upsertScoredMatch(
    candidateId: number,
    externalJobId: number,
    scores: MatchScores,
  ): Promise<CandidateJobMatch> {
    const nextId = await this.nextMatchId();
    const now = new Date();
    const doc = await this.documents
      .findOneAndUpdate(
        { candidateId, externalJobId },
        {
          $set: {
            similarityScore: scores.similarityScore,
            structuredScore: scores.structuredScore,
            overallScore: scores.overallScore,
            matchDetails: scores.matchDetails,
            updatedAt: now,
          },
          $setOnInsert: { _id: nextId, candidateId, externalJobId, createdAt: now },
        },
        { upsert: true, returnDocument: "after" },
      )
      .lean()
      .exec();
    return this.toDomain(doc) as CandidateJobMatch;
  }

  private async nextMatchId(): Promise<number> {
    const database = this.model.db.db;
    if (!database) {
      throw new Error("Mongo connection is not ready for id sequencing");
    }
    const counters = database.collection<{ _id: string; seq: number }>("counters");
    const name = this.model.collection.collectionName;
    const incremented = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );
    if (incremented) {
      return incremented.seq;
    }
    const highest = await this.documents.findOne().sort({ _id: -1 }).lean().exec();
    const start = highest ? Number(highest._id) : 0;
    await counters.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
    const seeded = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );
    return seeded ? seeded.seq : start + 1;
  }

  async recommendedJobsForCandidate(
    candidateId: number,
    includeDismissed: boolean,
    limit: number,
    filters: RecommendedMatchCountFilters | null = null,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const jobFilter = buildLiveJobFilter(filters);
    const matchFilter: Record<string, unknown> = { candidateId };
    if (!includeDismissed) {
      matchFilter.dismissed = false;
    }

    // A "narrow" filter (province / city / category / source / search / salary)
    // can exclude most of a candidate's top-ranked matches, so we must select the
    // top-N OF THE FILTERED SET — pre-resolve the matching job ids and constrain
    // the match query by them.
    //
    // The default browse (country + still-live only) excludes very little, so we
    // skip that all-jobs id pre-fetch (slow once there are 12k+ jobs) and push the
    // live/country filter into the populate `match`. A candidate's top matches are
    // already in their target countries, so dropping the rare out-of-scope row
    // from the fetch window is cheap and keeps the query O(candidate's matches)
    // regardless of how many jobs exist in total.
    const isNarrow = Boolean(
      filters &&
        ((filters.provinces && filters.provinces.length > 0) ||
          (filters.cities && filters.cities.length > 0) ||
          filters.category ||
          filters.search ||
          (filters.sourceIds && filters.sourceIds.length > 0) ||
          (filters.minSalary != null && filters.minSalary > 0)),
    );

    if (!isNarrow) {
      const docs = await this.documents
        .find(matchFilter)
        .sort({ overallScore: -1 })
        .limit(limit)
        .populate({ path: "externalJob", select: "-embedding", match: jobFilter })
        .lean()
        .exec();
      const live = docs.filter((doc) => (doc as Record<string, unknown>).externalJob != null);
      return this.toDomainList(live) as Array<CandidateJobMatch & { externalJob: ExternalJob }>;
    }

    const externalJobModel = this.model.db.model<Record<string, unknown>>("ExternalJob");
    const liveJobs = await externalJobModel.find(jobFilter).select("_id").lean().exec();
    const liveJobIds = liveJobs.map((job) => job._id as number);
    matchFilter.externalJobId = { $in: liveJobIds };
    const docs = await this.documents
      .find(matchFilter)
      .sort({ overallScore: -1 })
      .limit(limit)
      .populate({ path: "externalJob", select: "-embedding" })
      .lean()
      .exec();
    return this.toDomainList(docs) as Array<CandidateJobMatch & { externalJob: ExternalJob }>;
  }

  async matchingCandidatesForJob(
    externalJobId: number,
    limit: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>> {
    const docs = await this.documents
      .find({ externalJobId, dismissed: false })
      .sort({ overallScore: -1 })
      .limit(limit)
      .populate("candidate")
      .lean()
      .exec();
    return this.toDomainList(docs) as Array<CandidateJobMatch & { candidate: Candidate }>;
  }

  async setDismissed(matchId: number, dismissed: boolean, reason?: string | null): Promise<void> {
    const update: Record<string, unknown> = { dismissed };
    if (reason !== undefined) {
      update.dismissReason = reason;
    }
    await this.documents.findByIdAndUpdate(matchId, update).exec();
  }

  async findDismissedForCandidate(candidateId: number): Promise<CandidateJobMatch[]> {
    const docs = await this.documents.find({ candidateId, dismissed: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteForCandidates(candidateIds: number[]): Promise<number> {
    if (candidateIds.length === 0) return 0;
    const result = await this.documents.deleteMany({ candidateId: { $in: candidateIds } }).exec();
    return result.deletedCount ?? 0;
  }

  countActiveForCandidates(candidateIds: number[]): Promise<number> {
    if (candidateIds.length === 0) return Promise.resolve(0);
    return this.documents
      .countDocuments({ candidateId: { $in: candidateIds }, dismissed: false })
      .exec();
  }

  async countRecommendedForCandidates(
    candidateIds: number[],
    filters: RecommendedMatchCountFilters | null,
  ): Promise<number> {
    if (candidateIds.length === 0) return 0;

    const jobMatch = buildLiveJobFilter(filters);

    const result = await this.documents
      .aggregate<{ total: number }>([
        { $match: { candidateId: { $in: candidateIds }, dismissed: false } },
        {
          $lookup: {
            from: "cv_assistant_external_jobs",
            let: { jid: "$externalJobId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$jid"] } } },
              { $match: jobMatch },
              { $project: { _id: 1 } },
            ],
            as: "job",
          },
        },
        { $match: { "job.0": { $exists: true } } },
        { $group: { _id: "$externalJobId" } },
        { $count: "total" },
      ])
      .exec();

    return result.length > 0 ? result[0].total : 0;
  }

  async facetRowsForCandidates(candidateIds: number[]): Promise<RecommendedFacetRow[]> {
    if (candidateIds.length === 0) return [];
    const rows = await this.documents
      .aggregate<RecommendedFacetRow & { _id: number }>([
        { $match: { candidateId: { $in: candidateIds }, dismissed: false } },
        {
          $lookup: {
            from: "cv_assistant_external_jobs",
            let: { jid: "$externalJobId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$jid"] } } },
              {
                $match: {
                  delisted: { $ne: true },
                  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
                },
              },
              {
                $project: {
                  country: 1,
                  canonicalProvince: 1,
                  canonicalCity: 1,
                  canonicalCategory: 1,
                  sourceId: 1,
                  salaryMin: 1,
                  salaryMax: 1,
                  title: 1,
                  company: 1,
                  locationArea: 1,
                  locationRaw: 1,
                },
              },
            ],
            as: "job",
          },
        },
        { $unwind: "$job" },
        { $group: { _id: "$externalJobId", job: { $first: "$job" } } },
        { $replaceRoot: { newRoot: "$job" } },
      ])
      .exec();
    return rows.map((row) => ({
      country: row.country ?? null,
      canonicalProvince: row.canonicalProvince ?? null,
      canonicalCity: row.canonicalCity ?? null,
      canonicalCategory: row.canonicalCategory ?? null,
      sourceId: row.sourceId ?? null,
      salaryMin: row.salaryMin ?? null,
      salaryMax: row.salaryMax ?? null,
      title: row.title ?? null,
      company: row.company ?? null,
      locationArea: row.locationArea ?? null,
      locationRaw: row.locationRaw ?? null,
    }));
  }

  countActiveForCandidatesSince(candidateIds: number[], since: Date): Promise<number> {
    if (candidateIds.length === 0) return Promise.resolve(0);
    return this.documents
      .countDocuments({
        candidateId: { $in: candidateIds },
        dismissed: false,
        createdAt: { $gte: since },
      })
      .exec();
  }

  async weeklyDigestMatches(
    jobPostingIds: number[],
    since: Date,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob; candidate: Candidate }>> {
    const candidateModel = this.model.db.model<Record<string, unknown>>("Candidate");
    const candidates = await candidateModel
      .find({ jobPostingId: { $in: jobPostingIds } })
      .select("_id")
      .lean()
      .exec();
    const candidateIds = candidates.map((c) => c._id as number);
    const docs = await this.documents
      .find({
        createdAt: { $gt: since },
        candidateId: { $in: candidateIds },
        overallScore: { $gte: 0.7 },
      })
      .sort({ overallScore: -1 })
      .limit(10)
      .populate(["externalJob", "candidate"])
      .lean()
      .exec();
    return this.toDomainList(docs) as Array<
      CandidateJobMatch & { externalJob: ExternalJob; candidate: Candidate }
    >;
  }

  async recentMatchesForCandidate(
    candidateId: number,
    since: Date,
    threshold: number,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const docs = await this.documents
      .find({
        candidateId,
        createdAt: { $gt: since },
        overallScore: { $gte: threshold },
        dismissed: false,
      })
      .sort({ overallScore: -1 })
      .limit(5)
      .populate("externalJob")
      .lean()
      .exec();
    return this.toDomainList(docs) as Array<CandidateJobMatch & { externalJob: ExternalJob }>;
  }
}
