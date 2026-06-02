import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitCandidateEeAttributes } from "../entities/annix-orbit-candidate-ee-attributes.entity";
import {
  AnnixOrbitCandidateEeAttributesRepository,
  EeDemographicRow,
  EeReportRow,
} from "./annix-orbit-candidate-ee-attributes.repository";

@Injectable()
export class MongoAnnixOrbitCandidateEeAttributesRepository
  extends MongoCrudRepository<AnnixOrbitCandidateEeAttributes>
  implements AnnixOrbitCandidateEeAttributesRepository
{
  constructor(
    @InjectModel("AnnixOrbitCandidateEeAttributes", ORBIT_CONNECTION)
    model: Model<AnnixOrbitCandidateEeAttributes>,
  ) {
    super(model);
  }

  async findActiveForCandidate(
    candidateId: number,
  ): Promise<AnnixOrbitCandidateEeAttributes | null> {
    const doc = await this.documents.findOne({ candidateId, deletedAt: null }).lean().exec();
    return this.toDomain(doc);
  }

  async tombstoneActiveForCandidate(candidateId: number, deletedAt: Date): Promise<number> {
    const result = await this.documents
      .updateMany({ candidateId, deletedAt: null }, { deletedAt })
      .exec();
    return result.modifiedCount ?? 0;
  }

  private async candidateIdsForJob(jobPostingId: number): Promise<number[]> {
    const candidateModel = this.model.db.model<Record<string, unknown>>("Candidate");
    const candidates = await candidateModel.find({ jobPostingId }).select("_id").lean().exec();
    return candidates.map((c) => c._id as number);
  }

  private async candidatesForCompany(
    companyId: number,
  ): Promise<Array<{ id: number; status: string; jobPostingId: number }>> {
    const jobModel = this.model.db.model<Record<string, unknown>>("JobPosting");
    const candidateModel = this.model.db.model<Record<string, unknown>>("Candidate");
    const jobs = await jobModel.find({ companyId }).select("_id").lean().exec();
    const jobIds = jobs.map((j) => j._id as number);
    const candidates = await candidateModel
      .find({ jobPostingId: { $in: jobIds } })
      .select(["_id", "status", "jobPostingId"])
      .lean()
      .exec();
    return candidates.map((c) => ({
      id: c._id as number,
      status: c.status as string,
      jobPostingId: c.jobPostingId as number,
    }));
  }

  async aggregateForJob(jobPostingId: number): Promise<EeDemographicRow[]> {
    const candidateIds = await this.candidateIdsForJob(jobPostingId);
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds }, deletedAt: null })
      .lean()
      .exec();
    return docs.map((d) => ({
      population_group: d.populationGroup as string,
      gender: d.gender as string,
      disability_status: d.disabilityStatus as string,
      nationality_status: d.nationalityStatus as string,
    }));
  }

  async aggregateForCompany(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<EeDemographicRow[]> {
    const candidates = await this.candidatesForCompany(companyId);
    const candidateIds = candidates.map((c) => c.id);
    const docs = await this.documents
      .find({
        candidateId: { $in: candidateIds },
        deletedAt: null,
        consentGrantedAt: { $gte: dateFrom, $lt: dateTo },
      })
      .lean()
      .exec();
    return docs.map((d) => ({
      population_group: d.populationGroup as string,
      gender: d.gender as string,
      disability_status: d.disabilityStatus as string,
      nationality_status: d.nationalityStatus as string,
    }));
  }

  async reportRows(companyId: number, dateFrom: Date, dateTo: Date): Promise<EeReportRow[]> {
    const candidates = await this.candidatesForCompany(companyId);
    const candidateById = new Map(candidates.map((c) => [c.id, c]));
    const candidateIds = candidates.map((c) => c.id);
    const jobModel = this.model.db.model<Record<string, unknown>>("JobPosting");
    const jobs = await jobModel
      .find({ companyId })
      .select(["_id", "occupationalLevel"])
      .lean()
      .exec();
    const occLevelByJob = new Map(
      jobs.map((j) => [j._id as number, (j.occupationalLevel as string | null) ?? null]),
    );
    const docs = await this.documents
      .find({
        candidateId: { $in: candidateIds },
        deletedAt: null,
        consentGrantedAt: { $gte: dateFrom, $lt: dateTo },
      })
      .lean()
      .exec();
    return docs.flatMap((d) => {
      const candidate = candidateById.get(d.candidateId as number);
      if (!candidate) return [];
      return [
        {
          candidate_id: candidate.id,
          candidate_status: candidate.status,
          occupational_level: occLevelByJob.get(candidate.jobPostingId) ?? null,
          population_group: d.populationGroup as string,
          gender: d.gender as string,
          disability_status: d.disabilityStatus as string,
          nationality_status: d.nationalityStatus as string,
        },
      ];
    });
  }
}
