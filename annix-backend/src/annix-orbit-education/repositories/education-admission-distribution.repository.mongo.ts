import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationAdmissionDistribution } from "../entities/education-admission-distribution.entity";
import { EducationAdmissionDistributionRepository } from "./education-admission-distribution.repository";

@Injectable()
export class MongoEducationAdmissionDistributionRepository
  extends MongoCrudRepository<EducationAdmissionDistribution>
  implements EducationAdmissionDistributionRepository
{
  constructor(
    @InjectModel("EducationAdmissionDistribution")
    model: Model<EducationAdmissionDistribution>,
  ) {
    super(model);
  }

  async forProgrammeOrderedByYear(programmeId: string): Promise<EducationAdmissionDistribution[]> {
    const docs = await this.documents.find({ programmeId }).sort({ intakeYear: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
