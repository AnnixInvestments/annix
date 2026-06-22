import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { WorkflowStepConfigRepository } from "./workflow-step-config.repository";

@Injectable()
export class MongoWorkflowStepConfigRepository
  extends MongoTenantScopedRepository<WorkflowStepConfig>
  implements WorkflowStepConfigRepository
{
  constructor(
    @InjectModel("WorkflowStepConfig") model: Model<WorkflowStepConfig>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoWorkflowStepConfigRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoWorkflowStepConfigRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoWorkflowStepConfigRepository {
    return new MongoWorkflowStepConfigRepository(this.model, session);
  }

  build(data: DeepPartial<WorkflowStepConfig>): WorkflowStepConfig {
    return data as WorkflowStepConfig;
  }

  async saveForCompany(companyId: number, entity: WorkflowStepConfig): Promise<WorkflowStepConfig> {
    if (entity.companyId !== companyId) {
      throw new Error("Step config does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: WorkflowStepConfig): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Step config does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOrderedForeground(companyId: number): Promise<WorkflowStepConfig[]> {
    const docs = await this.documents
      .find({ companyId, isBackground: false })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOrderedBackground(companyId: number): Promise<WorkflowStepConfig[]> {
    const docs = await this.documents
      .find({ companyId, isBackground: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBackgroundForTrigger(
    companyId: number,
    triggerStepKey: string,
  ): Promise<WorkflowStepConfig[]> {
    const docs = await this.documents
      .find({ companyId, isBackground: true, triggerAfterStep: triggerStepKey })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompany(companyId: number): Promise<WorkflowStepConfig[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyByKey(companyId: number, key: string): Promise<WorkflowStepConfig | null> {
    const doc = await this.documents.findOne({ companyId, key }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForegroundForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<WorkflowStepConfig | null> {
    const doc = await this.documents.findOne({ companyId, key, isBackground: false }).lean().exec();
    return this.toDomain(doc);
  }

  async insertManyIgnore(entities: DeepPartial<WorkflowStepConfig>[]): Promise<void> {
    await this.documents.insertMany(entities, { ordered: false }).catch(() => undefined);
  }

  async updateByCompanyAndKey(
    companyId: number,
    key: string,
    updates: DeepPartial<WorkflowStepConfig>,
  ): Promise<number> {
    const result = await this.documents.updateMany({ companyId, key }, { $set: updates }).exec();
    return result.modifiedCount;
  }

  async updateById(id: number, updates: DeepPartial<WorkflowStepConfig>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async updateTriggerAfterStep(
    companyId: number,
    triggerAfterStep: string,
    newTriggerAfterStep: string | null,
  ): Promise<void> {
    await this.documents
      .updateMany(
        { companyId, triggerAfterStep },
        { $set: { triggerAfterStep: newTriggerAfterStep } },
      )
      .exec();
  }

  async bumpSortOrderAfter(companyId: number, sortOrder: number): Promise<void> {
    await this.documents
      .updateMany({ companyId, sortOrder: { $gt: sortOrder } }, { $inc: { sortOrder: 1 } })
      .exec();
  }
}
