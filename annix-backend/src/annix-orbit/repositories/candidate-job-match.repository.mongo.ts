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

  if (filters?.category) {
    query.category = filters.category;
  }
  if (filters?.province) {
    const rx = new RegExp(escapeRegex(filters.province), "i");
    and.push({ $or: [{ locationArea: rx }, { locationRaw: rx }] });
  }
  if (filters?.city) {
    const rx = new RegExp(escapeRegex(filters.city), "i");
    and.push({ $or: [{ locationArea: rx }, { locationRaw: rx }] });
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

  async recommendedJobsForCandidate(
    candidateId: number,
    includeDismissed: boolean,
    limit: number,
    filters: RecommendedMatchCountFilters | null = null,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const externalJobModel = this.model.db.model<Record<string, unknown>>("ExternalJob");
    const liveJobs = await externalJobModel
      .find(buildLiveJobFilter(filters))
      .select("_id")
      .lean()
      .exec();
    const liveJobIds = liveJobs.map((job) => job._id as number);
    const filter: Record<string, unknown> = {
      candidateId,
      externalJobId: { $in: liveJobIds },
    };
    if (!includeDismissed) {
      filter.dismissed = false;
    }
    const docs = await this.documents
      .find(filter)
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
