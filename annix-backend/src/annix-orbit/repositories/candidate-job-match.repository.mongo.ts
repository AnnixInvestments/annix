import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import type { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import type { ExternalJob } from "../entities/external-job.entity";
import { CandidateJobMatchRepository } from "./candidate-job-match.repository";

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
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const externalJobModel = this.model.db.model<Record<string, unknown>>("ExternalJob");
    const liveJobs = await externalJobModel
      .find({ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] })
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
      .populate("externalJob")
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

  async setDismissed(matchId: number, dismissed: boolean): Promise<void> {
    await this.documents.findByIdAndUpdate(matchId, { dismissed }).exec();
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
