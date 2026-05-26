import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationRecommendationSnapshot } from "../entities/education-recommendation-snapshot.entity";
import { EducationRecommendationSnapshotRepository } from "./education-recommendation-snapshot.repository";

@Injectable()
export class MongoEducationRecommendationSnapshotRepository
  extends MongoCrudRepository<EducationRecommendationSnapshot>
  implements EducationRecommendationSnapshotRepository
{
  constructor(
    @InjectModel("EducationRecommendationSnapshot")
    model: Model<EducationRecommendationSnapshot>,
  ) {
    super(model);
  }
}
