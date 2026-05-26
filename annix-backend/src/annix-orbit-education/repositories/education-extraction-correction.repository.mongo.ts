import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationExtractionCorrection } from "../entities/education-extraction-correction.entity";
import { EducationExtractionCorrectionRepository } from "./education-extraction-correction.repository";

@Injectable()
export class MongoEducationExtractionCorrectionRepository
  extends MongoCrudRepository<EducationExtractionCorrection>
  implements EducationExtractionCorrectionRepository
{
  constructor(
    @InjectModel("EducationExtractionCorrection")
    model: Model<EducationExtractionCorrection>,
  ) {
    super(model);
  }

  async recentForInstitution(
    institutionId: string,
    limit: number,
  ): Promise<EducationExtractionCorrection[]> {
    const docs = await this.documents
      .find({ institutionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
