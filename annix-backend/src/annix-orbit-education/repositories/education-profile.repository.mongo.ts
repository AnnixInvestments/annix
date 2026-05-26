import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationProfile } from "../entities/education-profile.entity";
import { EducationProfileRepository } from "./education-profile.repository";

@Injectable()
export class MongoEducationProfileRepository
  extends MongoCrudRepository<EducationProfile>
  implements EducationProfileRepository
{
  constructor(@InjectModel("EducationProfile") model: Model<EducationProfile>) {
    super(model);
  }

  async findByUserId(userId: number): Promise<EducationProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }
}
