import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CandidateReference, ReferenceStatus } from "../entities/candidate-reference.entity";
import { CandidateReferenceRepository } from "./candidate-reference.repository";

@Injectable()
export class MongoCandidateReferenceRepository
  extends MongoCrudRepository<CandidateReference>
  implements CandidateReferenceRepository
{
  constructor(
    @InjectModel("CandidateReference", ORBIT_CONNECTION) model: Model<CandidateReference>,
  ) {
    super(model);
  }

  async findByCandidate(candidateId: number): Promise<CandidateReference[]> {
    const docs = await this.documents.find({ candidateId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByCandidateAndStatus(
    candidateId: number,
    status: ReferenceStatus,
  ): Promise<CandidateReference[]> {
    const docs = await this.documents.find({ candidateId, status }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByFeedbackToken(token: string): Promise<CandidateReference | null> {
    const doc = await this.documents.findOne({ feedbackToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  async findByFeedbackTokenWithCandidate(token: string): Promise<CandidateReference | null> {
    const doc = await this.documents
      .findOne({ feedbackToken: token })
      .populate({ path: "candidate", populate: { path: "jobPosting" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingRemindersBefore(cutoff: Date): Promise<CandidateReference[]> {
    const docs = await this.documents
      .find({
        status: ReferenceStatus.REQUESTED,
        requestSentAt: { $lt: cutoff },
        reminderSentAt: null,
      })
      .populate({ path: "candidate", populate: { path: "jobPosting" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async referencesForCompany(
    companyId: number,
    status?: ReferenceStatus,
  ): Promise<CandidateReference[]> {
    const jobModel = this.model.db.model<Record<string, unknown>>("JobPosting");
    const candidateModel = this.model.db.model<Record<string, unknown>>("Candidate");
    const jobs = await jobModel.find({ companyId }).select("_id").lean().exec();
    const jobIds = jobs.map((j) => j._id as number);
    const candidates = await candidateModel
      .find({ jobPostingId: { $in: jobIds } })
      .select("_id")
      .lean()
      .exec();
    const candidateIds = candidates.map((c) => c._id as number);
    const filter: Record<string, unknown> = { candidateId: { $in: candidateIds } };
    if (status) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "candidate", populate: { path: "jobPosting" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async removeMany(references: CandidateReference[]): Promise<void> {
    const ids = references.map((r) => r.id);
    if (ids.length === 0) return;
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }
}
