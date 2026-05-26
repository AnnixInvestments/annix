import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangePtRating } from "./entities/flange-pt-rating.entity";

export abstract class FlangePtRatingRepository extends CrudRepository<FlangePtRating> {
  abstract saveMany(entities: FlangePtRating[]): Promise<FlangePtRating[]>;
  abstract findAllWithRelations(): Promise<FlangePtRating[]>;
  abstract findByPressureClassId(pressureClassId: number): Promise<FlangePtRating[]>;
  abstract findByPressureClassAndMaterial(
    pressureClassId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]>;
  abstract findByStandardAndMaterial(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]>;
  abstract distinctMaterialGroups(): Promise<{ materialGroup: string }[]>;
  abstract findByStandardAndMaterialOrdered(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]>;
}
