import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";
import { WorkflowStepAssignmentRepository } from "./workflow-step-assignment.repository";

@Injectable()
export class MongoWorkflowStepAssignmentRepository
  extends MongoTenantScopedRepository<WorkflowStepAssignment>
  implements WorkflowStepAssignmentRepository
{
  constructor(
    @InjectModel("WorkflowStepAssignment") model: Model<WorkflowStepAssignment>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoWorkflowStepAssignmentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoWorkflowStepAssignmentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoWorkflowStepAssignmentRepository {
    return new MongoWorkflowStepAssignmentRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: WorkflowStepAssignment,
  ): Promise<WorkflowStepAssignment> {
    if (entity.companyId !== companyId) {
      throw new Error("Step assignment does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: WorkflowStepAssignment): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Step assignment does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  buildMany(rows: DeepPartial<WorkflowStepAssignment>[]): WorkflowStepAssignment[] {
    return rows as WorkflowStepAssignment[];
  }

  async saveMany(entities: WorkflowStepAssignment[]): Promise<WorkflowStepAssignment[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findForCompanyWithUser(companyId: number): Promise<WorkflowStepAssignment[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["user"])
      .sort({ workflowStep: 1, isPrimary: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForStepWithUser(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    const docs = await this.documents
      .find({ companyId, workflowStep: step })
      .populate(["user"])
      .sort({ isPrimary: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOnePrimaryForStepWithSecondaryUser(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment | null> {
    const doc = await this.documents
      .findOne({ companyId, workflowStep: step, isPrimary: true })
      .populate(["secondaryUser"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findUserIdsForStep(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    const docs = await this.documents
      .find({ companyId, workflowStep: step })
      .select("userId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteForStep(companyId: number, step: string): Promise<void> {
    await this.documents.deleteMany({ companyId, workflowStep: step }).exec();
  }

  async deleteForUser(companyId: number, userId: number): Promise<void> {
    await this.documents.deleteMany({ companyId, userId }).exec();
  }

  async findForStepWithUserRelation(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment[]> {
    const docs = await this.documents
      .find({ companyId, workflowStep: step })
      .populate(["user"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countForStep(companyId: number, step: string): Promise<number> {
    return this.documents.countDocuments({ companyId, workflowStep: step }).exec();
  }
}
