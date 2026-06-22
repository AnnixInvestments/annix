import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";
import { JobCardActionCompletionRepository } from "./job-card-action-completion.repository";

@Injectable()
export class MongoJobCardActionCompletionRepository
  extends MongoTenantScopedRepository<JobCardActionCompletion>
  implements JobCardActionCompletionRepository
{
  constructor(
    @InjectModel("JobCardActionCompletion")
    model: Model<JobCardActionCompletion>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardActionCompletionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardActionCompletionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardActionCompletionRepository {
    return new MongoJobCardActionCompletionRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: JobCardActionCompletion,
  ): Promise<JobCardActionCompletion> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card action completion does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardActionCompletion): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card action completion does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneForStepAction(
    jobCardId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null> {
    const doc = await this.documents.findOne({ jobCardId, stepKey, actionType }).lean().exec();
    return this.toDomain(doc);
  }

  async findForJobCardOrdered(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardActionCompletion[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ completedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCardStepAction(
    jobCardId: number,
    companyId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null> {
    const doc = await this.documents
      .findOne({ jobCardId, companyId, stepKey, actionType })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
