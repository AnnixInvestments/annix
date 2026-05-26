import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberThicknessRecommendation } from "../entities/rubber-application.entity";
import { RubberThicknessRecommendationRepository } from "./rubber-thickness-recommendation.repository";

@Injectable()
export class MongoRubberThicknessRecommendationRepository
  extends MongoCrudRepository<RubberThicknessRecommendation>
  implements RubberThicknessRecommendationRepository
{
  constructor(
    @InjectModel("RubberThicknessRecommendation")
    model: Model<RubberThicknessRecommendation>,
  ) {
    super(model);
  }

  async findAllOrderedByThickness(): Promise<RubberThicknessRecommendation[]> {
    const docs = await this.documents.find().sort({ nominalThicknessMm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
