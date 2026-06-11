import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerWorkflowStep } from "../entities/seeker-workflow-step.entity";
import { SeekerWorkflowStepRepository } from "./seeker-workflow-step.repository";

@Injectable()
export class MongoSeekerWorkflowStepRepository
  extends MongoCrudRepository<SeekerWorkflowStep>
  implements SeekerWorkflowStepRepository
{
  constructor(
    @InjectModel("SeekerWorkflowStep", ORBIT_CONNECTION) model: Model<SeekerWorkflowStep>,
  ) {
    super(model);
  }

  async findByParticipantAndStep(
    participantId: string,
    stepKey: string,
  ): Promise<SeekerWorkflowStep | null> {
    const doc = await this.documents.findOne({ participantId, stepKey }).lean().exec();
    return this.toDomain(doc);
  }

  async listByParticipant(participantId: string): Promise<SeekerWorkflowStep[]> {
    const docs = await this.documents.find({ participantId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
