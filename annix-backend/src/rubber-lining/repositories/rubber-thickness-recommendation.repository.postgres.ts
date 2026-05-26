import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberThicknessRecommendation } from "../entities/rubber-application.entity";
import { RubberThicknessRecommendationRepository } from "./rubber-thickness-recommendation.repository";

@Injectable()
export class PostgresRubberThicknessRecommendationRepository
  extends TypeOrmCrudRepository<RubberThicknessRecommendation>
  implements RubberThicknessRecommendationRepository
{
  constructor(
    @InjectRepository(RubberThicknessRecommendation)
    repository: Repository<RubberThicknessRecommendation>,
  ) {
    super(repository);
  }

  findAllOrderedByThickness(): Promise<RubberThicknessRecommendation[]> {
    return this.repository.find({
      order: { nominalThicknessMm: "ASC" },
    });
  }
}
