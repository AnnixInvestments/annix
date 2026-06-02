import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AcademicResult } from "../entities/academic-result.entity";
import { AcademicResultRepository } from "./academic-result.repository";

@Injectable()
export class MongoAcademicResultRepository
  extends MongoCrudRepository<AcademicResult>
  implements AcademicResultRepository
{
  constructor(@InjectModel("AcademicResult", ORBIT_CONNECTION) model: Model<AcademicResult>) {
    super(model);
  }

  async orderedForProfile(educationProfileId: string): Promise<AcademicResult[]> {
    const docs = await this.documents
      .find({ educationProfileId })
      .sort({ year: -1, subject: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async forProfile(educationProfileId: string): Promise<AcademicResult[]> {
    const docs = await this.documents.find({ educationProfileId }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteByIdForProfile(resultId: string, educationProfileId: string): Promise<number> {
    const result = await this.documents.deleteOne({ _id: resultId, educationProfileId }).exec();
    return result.deletedCount ?? 0;
  }
}
