import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationFaculty } from "../entities/education-faculty.entity";
import { EducationFacultyRepository } from "./education-faculty.repository";

@Injectable()
export class MongoEducationFacultyRepository
  extends MongoCrudRepository<EducationFaculty>
  implements EducationFacultyRepository
{
  constructor(@InjectModel("EducationFaculty", ORBIT_CONNECTION) model: Model<EducationFaculty>) {
    super(model);
  }

  async forInstitutionOrderedByName(institutionId: string): Promise<EducationFaculty[]> {
    const docs = await this.documents.find({ institutionId }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
