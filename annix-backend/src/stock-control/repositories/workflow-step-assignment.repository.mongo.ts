import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";
import { WorkflowStepAssignmentRepository } from "./workflow-step-assignment.repository";

@Injectable()
export class MongoWorkflowStepAssignmentRepository
  extends MongoCrudRepository<WorkflowStepAssignment>
  implements WorkflowStepAssignmentRepository
{
  constructor(@InjectModel("WorkflowStepAssignment") model: Model<WorkflowStepAssignment>) {
    super(model);
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
