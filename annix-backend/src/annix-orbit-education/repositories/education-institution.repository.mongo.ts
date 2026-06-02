import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationInstitution } from "../entities/education-institution.entity";
import { EducationInstitutionRepository } from "./education-institution.repository";

@Injectable()
export class MongoEducationInstitutionRepository
  extends MongoCrudRepository<EducationInstitution>
  implements EducationInstitutionRepository
{
  constructor(
    @InjectModel("EducationInstitution", ORBIT_CONNECTION) model: Model<EducationInstitution>,
  ) {
    super(model);
  }

  async allOrderedByName(): Promise<EducationInstitution[]> {
    const docs = await this.documents.find().sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
