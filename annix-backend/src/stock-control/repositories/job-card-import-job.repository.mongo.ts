import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";
import { JobCardImportJobRepository } from "./job-card-import-job.repository";

@Injectable()
export class MongoJobCardImportJobRepository
  extends MongoCrudRepository<JobCardImportJob>
  implements JobCardImportJobRepository
{
  constructor(
    @InjectModel("JobCardImportJob")
    model: Model<JobCardImportJob>,
  ) {
    super(model);
  }

  async findActiveForUser(
    companyId: number,
    createdByUserId: number | null,
  ): Promise<JobCardImportJob[]> {
    const docs = await this.documents
      .find({
        companyId,
        createdByUserId,
        acknowledged: false,
        status: { $in: ["processing", "completed", "failed"] },
      })
      .sort({ _id: -1 })
      .limit(10)
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc)).filter((doc): doc is JobCardImportJob => !!doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<JobCardImportJob | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async markStaleProcessingFailed(error: string): Promise<number> {
    const result = await this.documents
      .updateMany({ status: "processing" }, { $set: { status: "failed", error } })
      .exec();
    return result.modifiedCount ?? 0;
  }
}
