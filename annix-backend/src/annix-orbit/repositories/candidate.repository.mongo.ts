import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import {
  CandidateAllForCompanyFilters,
  CandidateEmbeddingCoverageRow,
  CandidateRepository,
} from "./candidate.repository";

@Injectable()
export class MongoCandidateRepository
  extends MongoCrudRepository<Candidate>
  implements CandidateRepository
{
  constructor(@InjectModel("Candidate", ORBIT_CONNECTION) model: Model<Candidate>) {
    super(model);
  }

  async findByJobPosting(jobPostingId: number, status?: string): Promise<Candidate[]> {
    const filter: Record<string, unknown> = { jobPostingId };
    if (status) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .sort({ matchScore: -1, createdAt: -1 })
      .populate("references")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithJobAndReferences(id: number): Promise<Candidate | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["jobPosting", "references"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdWithJobPosting(id: number): Promise<Candidate | null> {
    const doc = await this.documents.findById(id).populate("jobPosting").lean().exec();
    return this.toDomain(doc);
  }

  findByIdWithJobAndReferencesRelations(id: number): Promise<Candidate | null> {
    return this.findByIdWithJobAndReferences(id);
  }

  private async candidateIdsForCompany(companyId: number): Promise<number[]> {
    const jobModel = this.model.db.model<Record<string, unknown>>("JobPosting");
    const jobs = await jobModel.find({ companyId }).select("_id").lean().exec();
    return jobs.map((j) => j._id as number);
  }

  async findAllForCompany(
    companyId: number,
    filters?: CandidateAllForCompanyFilters,
  ): Promise<Candidate[]> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const filter: Record<string, unknown> = { jobPostingId: { $in: jobIds } };
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.jobPostingId) {
      filter.jobPostingId = filters.jobPostingId;
    }
    const docs = await this.documents
      .find(filter)
      .sort({ matchScore: -1, createdAt: -1 })
      .populate(["jobPosting", "references"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async topCandidates(companyId: number, limit: number): Promise<Candidate[]> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const docs = await this.documents
      .find({ jobPostingId: { $in: jobIds }, status: { $nin: [CandidateStatus.REJECTED] } })
      .sort({ matchScore: -1 })
      .limit(limit)
      .populate("jobPosting")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async candidatesForCompany(companyId: number): Promise<Candidate[]> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const docs = await this.documents
      .find({ jobPostingId: { $in: jobIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async candidatesMissingEmbedding(): Promise<Candidate[]> {
    const docs = await this.documents
      .find({
        $and: [
          { $or: [{ embedding: null }, { embedding: { $exists: false } }] },
          {
            $or: [{ rawCvText: { $ne: null } }, { extractedData: { $ne: null } }],
          },
        ],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async embeddingCoverage(): Promise<CandidateEmbeddingCoverageRow> {
    const total = await this.documents.countDocuments({}).exec();
    const embedded = await this.documents
      .countDocuments({ embedding: { $exists: true, $ne: null } })
      .exec();
    return { total, embedded };
  }

  async listNonFixture(params: {
    search: string | null;
    skip: number;
    limit: number;
  }): Promise<[Candidate[], number]> {
    const filter: Record<string, unknown> = { isTestFixture: false };
    if (params.search) {
      const term = new RegExp(params.search, "i");
      filter.$or = [{ email: term }, { name: term }];
    }
    const docs = await this.documents
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(params.skip)
      .limit(params.limit)
      .lean()
      .exec();
    const total = await this.documents.countDocuments(filter).exec();
    return [this.toDomainList(docs), total];
  }

  async findByEmail(email: string): Promise<Candidate[]> {
    const docs = await this.documents.find({ email }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByEmailWithJobPosting(email: string): Promise<Candidate[]> {
    const docs = await this.documents.find({ email }).populate("jobPosting").lean().exec();
    return this.toDomainList(docs);
  }

  async findByEmailWithJobAndReferences(email: string): Promise<Candidate[]> {
    const docs = await this.documents
      .find({ email })
      .populate(["jobPosting", "references"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findInactiveBefore(cutoff: Date): Promise<Candidate[]> {
    const docs = await this.documents
      .find({
        $or: [
          { lastActiveAt: { $lt: cutoff } },
          { lastActiveAt: null, createdAt: { $lt: cutoff } },
        ],
      })
      .populate("references")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markRejectionSent(id: number, rejectionSentAt: Date): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, { rejectionSentAt, status: CandidateStatus.REJECTED })
      .exec();
  }

  async markAcceptanceSent(id: number, acceptanceSentAt: Date): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { acceptanceSentAt }).exec();
  }

  async deleteTestFixturesForJob(jobPostingId: number): Promise<number> {
    const result = await this.documents.deleteMany({ jobPostingId, isTestFixture: true }).exec();
    return result.deletedCount ?? 0;
  }

  async setEmbeddingVector(id: number, embeddingLiteral: string): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { embedding: `[${embeddingLiteral}]` }).exec();
  }

  async clearEmbedding(id: number): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { embedding: null }).exec();
  }

  async updateWorkProfile(id: number, workProfile: unknown): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { workProfile }).exec();
  }

  async updateTargetCategories(id: number, targetCategories: string[]): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { targetCategories }).exec();
  }

  async updateMatchTier(id: number, matchTier: string): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { matchTier }).exec();
  }

  async setTrial(id: number, trialTier: string | null, trialEndsAt: Date | null): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { trialTier, trialEndsAt }).exec();
  }

  async touchLastActiveByEmail(
    email: string,
    now: Date,
    staleBefore: Date,
    dayKey: string,
  ): Promise<void> {
    const result = await this.documents
      .updateMany(
        {
          email,
          $or: [{ lastActiveAt: null }, { lastActiveAt: { $lt: staleBefore } }],
        },
        { lastActiveAt: now },
      )
      .exec();
    if (result.modifiedCount > 0) {
      await this.model.db.collection("cv_assistant_seeker_activity_days").updateOne(
        { email, day: dayKey },
        {
          $inc: { count: 1 },
          $setOnInsert: { email, day: dayKey, createdAt: now },
          $set: { updatedAt: now },
        },
        { upsert: true },
      );
    }
  }

  async seekerActivityDaysForEmail(
    email: string,
    sinceKey: string,
  ): Promise<Array<{ day: string; count: number }>> {
    const docs = await this.model.db
      .collection("cv_assistant_seeker_activity_days")
      .find({ email, day: { $gte: sinceKey } })
      .sort({ day: 1 })
      .toArray();
    return docs.map((d) => ({ day: d.day as string, count: (d.count as number) ?? 0 }));
  }

  async grantMatchingConsent(ids: number[], consentedAt: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.documents
      .updateMany(
        { _id: { $in: ids } },
        { popiaConsent: true, popiaConsentedAt: consentedAt, jobAlertsOptIn: true },
      )
      .exec();
  }

  async withdrawMatching(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.documents
      .updateMany({ _id: { $in: ids } }, { embedding: null, jobAlertsOptIn: false })
      .exec();
  }

  async candidatesWithEmbedding(): Promise<Candidate[]> {
    const docs = await this.documents
      .find({ embedding: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async jobAlertCandidates(): Promise<Candidate[]> {
    const docs = await this.documents
      .find({ jobAlertsOptIn: true, popiaConsent: true })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countNewForJobsSince(jobPostingIds: number[], since: Date): Promise<number> {
    if (jobPostingIds.length === 0) return Promise.resolve(0);
    return this.documents
      .countDocuments({ jobPostingId: { $in: jobPostingIds }, createdAt: { $gt: since } })
      .exec();
  }

  async countForCompanyByStatuses(
    companyId: number,
    statuses: string[] | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<number> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const filter: Record<string, unknown> = { jobPostingId: { $in: jobIds } };
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.$gte = dateFrom;
      if (dateTo) createdAt.$lte = dateTo;
      filter.createdAt = createdAt;
    }
    if (statuses) {
      filter.status = { $in: statuses };
    }
    return this.documents.countDocuments(filter).exec();
  }

  async matchAccuracyData(
    companyId: number,
  ): Promise<Array<{ matchScore: number | null; status: string }>> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const docs = await this.documents
      .find({ jobPostingId: { $in: jobIds }, matchScore: { $ne: null } })
      .select(["matchScore", "status"])
      .lean()
      .exec();
    return docs.map((d) => ({
      matchScore: (d.matchScore as number | null) ?? null,
      status: d.status as string,
    }));
  }

  async funnelExportCandidates(
    companyId: number,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<Candidate[]> {
    const jobIds = await this.candidateIdsForCompany(companyId);
    const filter: Record<string, unknown> = { jobPostingId: { $in: jobIds } };
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.$gte = dateFrom;
      if (dateTo) createdAt.$lte = dateTo;
      filter.createdAt = createdAt;
    }
    const docs = await this.documents
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("jobPosting")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async fairnessRows(
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
    const candidates = await this.documents
      .find({ jobPostingId, status: { $in: screeningStatuses } })
      .sort({ createdAt: -1 })
      .limit(windowSize)
      .lean()
      .exec();
    const candidateIds = candidates.map((c) => c._id as number);
    const eeModel = this.model.db.model<Record<string, unknown>>("AnnixOrbitCandidateEeAttributes");
    const eeDocs = await eeModel
      .find({ candidateId: { $in: candidateIds }, deletedAt: null })
      .lean()
      .exec();
    const eeByCandidate = new Map(eeDocs.map((d) => [d.candidateId as number, d]));
    return candidates.flatMap((candidate) => {
      const ee = eeByCandidate.get(candidate._id as number);
      if (!ee) return [];
      return [
        {
          candidate_id: candidate._id as number,
          status: candidate.status as string,
          population_group: ee.populationGroup as string,
          gender: ee.gender as string,
          disability_status: ee.disabilityStatus as string,
          nationality_status: ee.nationalityStatus as string,
        },
      ];
    });
  }
}
