import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationProgramme } from "../entities/education-programme.entity";
import { EducationProgrammeRepository } from "./education-programme.repository";

@Injectable()
export class MongoEducationProgrammeRepository
  extends MongoCrudRepository<EducationProgramme>
  implements EducationProgrammeRepository
{
  constructor(
    @InjectModel("EducationProgramme", ORBIT_CONNECTION) model: Model<EducationProgramme>,
  ) {
    super(model);
  }

  async page(limit: number): Promise<EducationProgramme[]> {
    const docs = await this.documents.find().limit(limit).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIds(ids: string[]): Promise<EducationProgramme[]> {
    if (ids.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async listForInstitution(
    institutionId: string | null,
    limit: number,
  ): Promise<EducationProgramme[]> {
    const query = institutionId ? { institutionId } : {};
    const docs = await this.documents.find(query).sort({ name: 1 }).limit(limit).lean().exec();
    return this.toDomainList(docs);
  }
}
