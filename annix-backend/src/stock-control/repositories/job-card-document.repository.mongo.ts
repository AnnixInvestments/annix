import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardDocument } from "../entities/job-card-document.entity";
import { JobCardDocumentRepository } from "./job-card-document.repository";

@Injectable()
export class MongoJobCardDocumentRepository
  extends MongoCrudRepository<JobCardDocument>
  implements JobCardDocumentRepository
{
  constructor(@InjectModel("JobCardDocument") model: Model<JobCardDocument>) {
    super(model);
  }

  async findFirstForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument | null> {
    const doc = await this.documents
      .findOne({ jobCardId, companyId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
