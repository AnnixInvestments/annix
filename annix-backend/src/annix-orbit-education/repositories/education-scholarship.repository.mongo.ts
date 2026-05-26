import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationScholarship } from "../entities/education-scholarship.entity";
import { EducationScholarshipRepository } from "./education-scholarship.repository";

@Injectable()
export class MongoEducationScholarshipRepository
  extends MongoCrudRepository<EducationScholarship>
  implements EducationScholarshipRepository
{
  constructor(@InjectModel("EducationScholarship") model: Model<EducationScholarship>) {
    super(model);
  }

  async activeOrderedByName(limit: number): Promise<EducationScholarship[]> {
    const docs = await this.documents
      .find({ active: true })
      .sort({ name: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async allOrderedByName(): Promise<EducationScholarship[]> {
    const docs = await this.documents.find().sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
