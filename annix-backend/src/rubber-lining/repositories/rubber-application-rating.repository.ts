import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberApplicationRating } from "../entities/rubber-application.entity";

export interface ApplicationRatingFilters {
  typeNumber?: number;
  chemicalCategory?: string;
}

export abstract class RubberApplicationRatingRepository extends CrudRepository<RubberApplicationRating> {
  abstract findFilteredOrdered(
    filters?: ApplicationRatingFilters,
  ): Promise<RubberApplicationRating[]>;
  abstract findByChemicalCategoriesAndRatings(
    chemicalCategories: string[],
    resistanceRatings: string[],
  ): Promise<RubberApplicationRating[]>;
}
