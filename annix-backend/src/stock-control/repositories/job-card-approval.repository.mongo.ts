import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardApprovalRepository } from "./job-card-approval.repository";

@Injectable()
export class MongoJobCardApprovalRepository
  extends MongoCrudRepository<JobCardApproval>
  implements JobCardApprovalRepository
{
  constructor(@InjectModel("JobCardApproval") model: Model<JobCardApproval>) {
    super(model);
  }

  async findForJobCardOrdered(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardWithApprovedBy(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardApproval[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .populate("approvedBy")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLatestForStep(
    companyId: number,
    jobCardId: number,
    step: string,
  ): Promise<JobCardApproval | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId, step })
      .sort({ approvedAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteForJobCard(companyId: number, jobCardId: number): Promise<void> {
    await this.documents.deleteMany({ jobCardId, companyId }).exec();
  }

  countByStatus(companyId: number, status: ApprovalStatus): Promise<number> {
    return this.documents.countDocuments({ companyId, status }).exec();
  }

  async rejectPendingStep(
    jobCardId: number,
    step: string,
    changes: DeepPartial<JobCardApproval>,
  ): Promise<void> {
    await this.documents
      .updateMany(
        { jobCardId, step, status: ApprovalStatus.PENDING },
        changes as Record<string, unknown>,
      )
      .exec();
  }
}
