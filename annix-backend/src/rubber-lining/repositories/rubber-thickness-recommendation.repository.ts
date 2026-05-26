import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberThicknessRecommendation } from "../entities/rubber-application.entity";

export abstract class RubberThicknessRecommendationRepository extends CrudRepository<RubberThicknessRecommendation> {
  abstract findAllOrderedByThickness(): Promise<RubberThicknessRecommendation[]>;
}
