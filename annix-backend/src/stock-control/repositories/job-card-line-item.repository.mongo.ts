import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { JobCardLineItemRepository } from "./job-card-line-item.repository";

@Injectable()
export class MongoJobCardLineItemRepository
  extends MongoCrudRepository<JobCardLineItem>
  implements JobCardLineItemRepository
{
  constructor(@InjectModel("JobCardLineItem") model: Model<JobCardLineItem>) {
    super(model);
  }

  async findForJobCardAndCompany(jobCardId: number, companyId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedBySort(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedBySortAnyCompany(jobCardId: number): Promise<JobCardLineItem[]> {
    const docs = await this.documents.find({ jobCardId }).sort({ sortOrder: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdAndJobCard(id: number, jobCardId: number): Promise<JobCardLineItem | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId }).lean().exec();
    return this.toDomain(doc);
  }

  countForJobCard(jobCardId: number): Promise<number> {
    return this.documents.countDocuments({ jobCardId }).exec();
  }

  async deleteForJobCard(jobCardId: number): Promise<void> {
    await this.documents.deleteMany({ jobCardId }).exec();
  }

  async saveMany(entities: JobCardLineItem[]): Promise<JobCardLineItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  buildMany(rows: DeepPartial<JobCardLineItem>[]): JobCardLineItem[] {
    return rows as JobCardLineItem[];
  }
}
