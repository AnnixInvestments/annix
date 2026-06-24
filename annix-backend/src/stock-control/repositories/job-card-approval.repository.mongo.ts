import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardApprovalRepository } from "./job-card-approval.repository";

@Injectable()
export class MongoJobCardApprovalRepository
  extends MongoTenantScopedRepository<JobCardApproval>
  implements JobCardApprovalRepository
{
  constructor(
    @InjectModel("JobCardApproval") model: Model<JobCardApproval>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardApprovalRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardApprovalRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardApprovalRepository {
    return new MongoJobCardApprovalRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: JobCardApproval): Promise<JobCardApproval> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card approval does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardApproval): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card approval does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardOrdered(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findApprovedStepsForJobCardIds(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Array<{ jobCardId: number; step: string }>> {
    const docs = await this.documents
      .find({ companyId, jobCardId: { $in: jobCardIds }, status: "approved" })
      .select("jobCardId step")
      .lean()
      .exec();
    return docs.map((doc) => ({
      jobCardId: doc.jobCardId as number,
      step: doc.step as string,
    }));
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
