import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";
import { JobCardActionCompletionRepository } from "./job-card-action-completion.repository";

@Injectable()
export class MongoJobCardActionCompletionRepository
  extends MongoCrudRepository<JobCardActionCompletion>
  implements JobCardActionCompletionRepository
{
  constructor(
    @InjectModel("JobCardActionCompletion")
    model: Model<JobCardActionCompletion>,
  ) {
    super(model);
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
