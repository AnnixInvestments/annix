import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { JobCardDataBookRepository } from "./job-card-data-book.repository";

@Injectable()
export class MongoJobCardDataBookRepository
  extends MongoCrudRepository<JobCardDataBook>
  implements JobCardDataBookRepository
{
  constructor(@InjectModel("JobCardDataBook") model: Model<JobCardDataBook>) {
    super(model);
  }

  async findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardDataBook | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ generatedAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForJobCardIds(companyId: number, jobCardIds: number[]): Promise<JobCardDataBook[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId: { $in: jobCardIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
