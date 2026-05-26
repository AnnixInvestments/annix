import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationRequirementVersion } from "../entities/education-requirement-version.entity";
import { EducationRequirementVersionRepository } from "./education-requirement-version.repository";

@Injectable()
export class MongoEducationRequirementVersionRepository
  extends MongoCrudRepository<EducationRequirementVersion>
  implements EducationRequirementVersionRepository
{
  constructor(
    @InjectModel("EducationRequirementVersion") model: Model<EducationRequirementVersion>,
  ) {
    super(model);
  }

  async latestForProgrammeAndYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementVersion | null> {
    const doc = await this.documents
      .findOne({ programmeId, intakeYear })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async forProgrammeOrdered(programmeId: string): Promise<EducationRequirementVersion[]> {
    const docs = await this.documents
      .find({ programmeId })
      .sort({ intakeYear: -1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
