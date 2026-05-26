import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardVersion } from "../entities/job-card-version.entity";
import { JobCardVersionRepository } from "./job-card-version.repository";

@Injectable()
export class MongoJobCardVersionRepository
  extends MongoCrudRepository<JobCardVersion>
  implements JobCardVersionRepository
{
  constructor(@InjectModel("JobCardVersion") model: Model<JobCardVersion>) {
    super(model);
  }

  async findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardVersion[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardVersion | null> {
    const doc = await this.documents.findOne({ _id: id, jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
