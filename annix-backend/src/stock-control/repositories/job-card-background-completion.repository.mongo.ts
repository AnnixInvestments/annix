import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import { JobCardBackgroundCompletionRepository } from "./job-card-background-completion.repository";

@Injectable()
export class MongoJobCardBackgroundCompletionRepository
  extends MongoCrudRepository<JobCardBackgroundCompletion>
  implements JobCardBackgroundCompletionRepository
{
  constructor(
    @InjectModel("JobCardBackgroundCompletion")
    model: Model<JobCardBackgroundCompletion>,
  ) {
    super(model);
  }

  async findOneByJobCardAndStep(
    jobCardId: number,
    stepKey: string,
  ): Promise<JobCardBackgroundCompletion | null> {
    const doc = await this.documents.findOne({ jobCardId, stepKey }).lean().exec();
    return this.toDomain(doc);
  }

  async findForJobCardAndCompany(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardBackgroundCompletion[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number): Promise<JobCardBackgroundCompletion[]> {
    const docs = await this.documents.find({ jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCompany(companyId: number): Promise<JobCardBackgroundCompletion[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCompanyAndJobCardIds(
    companyId: number,
    jobCardIds: number[],
  ): Promise<JobCardBackgroundCompletion[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId: { $in: jobCardIds } })
      .select("jobCardId stepKey")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  buildMany(rows: DeepPartial<JobCardBackgroundCompletion>[]): JobCardBackgroundCompletion[] {
    return rows as JobCardBackgroundCompletion[];
  }

  async saveMany(entities: JobCardBackgroundCompletion[]): Promise<JobCardBackgroundCompletion[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async removeMany(entities: JobCardBackgroundCompletion[]): Promise<void> {
    await this.documents.deleteMany({ _id: { $in: entities.map((entity) => entity.id) } }).exec();
  }

  async deleteByJobCardCompanyStep(
    jobCardId: number,
    companyId: number,
    stepKey: string,
  ): Promise<void> {
    await this.documents.deleteMany({ jobCardId, companyId, stepKey }).exec();
  }
}
