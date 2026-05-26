import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationApplication } from "../entities/education-application.entity";
import { EducationApplicationRepository } from "./education-application.repository";

@Injectable()
export class MongoEducationApplicationRepository
  extends MongoCrudRepository<EducationApplication>
  implements EducationApplicationRepository
{
  constructor(@InjectModel("EducationApplication") model: Model<EducationApplication>) {
    super(model);
  }

  async orderedForProfile(educationProfileId: string): Promise<EducationApplication[]> {
    const docs = await this.documents
      .find({ educationProfileId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForProfile(
    applicationId: string,
    educationProfileId: string,
  ): Promise<EducationApplication | null> {
    const doc = await this.documents
      .findOne({ _id: applicationId, educationProfileId })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteByIdForProfile(applicationId: string, educationProfileId: string): Promise<number> {
    const result = await this.documents
      .deleteOne({ _id: applicationId, educationProfileId })
      .exec();
    return result.deletedCount ?? 0;
  }

  countForProfile(educationProfileId: string): Promise<number> {
    return this.documents.countDocuments({ educationProfileId }).exec();
  }
}
