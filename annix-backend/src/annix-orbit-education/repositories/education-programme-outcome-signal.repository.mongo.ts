import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationProgrammeOutcomeSignal } from "../entities/education-programme-outcome-signal.entity";
import { EducationProgrammeOutcomeSignalRepository } from "./education-programme-outcome-signal.repository";

@Injectable()
export class MongoEducationProgrammeOutcomeSignalRepository
  extends MongoCrudRepository<EducationProgrammeOutcomeSignal>
  implements EducationProgrammeOutcomeSignalRepository
{
  constructor(
    @InjectModel("EducationProgrammeOutcomeSignal", ORBIT_CONNECTION)
    model: Model<EducationProgrammeOutcomeSignal>,
  ) {
    super(model);
  }

  async forProgrammeIds(programmeIds: string[]): Promise<EducationProgrammeOutcomeSignal[]> {
    if (programmeIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ programmeId: { $in: programmeIds } })
      .sort({ asOf: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async forProgrammeOrdered(programmeId: string): Promise<EducationProgrammeOutcomeSignal[]> {
    const docs = await this.documents
      .find({ programmeId })
      .sort({ asOf: -1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
