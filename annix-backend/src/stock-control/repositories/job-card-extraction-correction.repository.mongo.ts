import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardExtractionCorrectionRepository } from "./job-card-extraction-correction.repository";

@Injectable()
export class MongoJobCardExtractionCorrectionRepository
  extends MongoCrudRepository<JobCardExtractionCorrection>
  implements JobCardExtractionCorrectionRepository
{
  constructor(
    @InjectModel("JobCardExtractionCorrection")
    model: Model<JobCardExtractionCorrection>,
  ) {
    super(model);
  }

  async findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentForCustomer(
    companyId: number,
    customerName: string,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId, customerName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
